export interface Position {
    row: number;
    col: number;
}

export interface Move {
    from: Position;
    to: Position;
    piece: string;
    captured?: string;
    castlingRightsBefore: Set<string>;
    castling?: boolean;
}

class ChessGame {
    board: string[][];
    lastMove: Move | null = null;
    moveLog: Move[] = [];
    redoStack: Move[] = [];
    castlingRights: Set<string> = new Set();
    history: { move: Move; fen: string }[] = [];
    halfMoveClock = 0;
    fullMoveNumber = 1;

    isCheck = false;
    checkKingPosition: Position | null = null;
    isCheckmate = false;
    isStalemate = false;
    isDraw = false;
    gameOver = false;
    winner: 'white' | 'black' | null = null;

    public constructor(fen: string) {
        const [boardPart, turn, castling, enPassant, halfMove, fullMove] = fen.split(" ");
        this.board = this.fenToBoard(boardPart);
        this.castlingRights = new Set(castling === "-" ? [] : castling.split(""));
        this.halfMoveClock = parseInt(halfMove, 10) || 0;
        this.fullMoveNumber = parseInt(fullMove, 10) || 1;
        this.updateGameState();
    }

    private fenToBoard(fenBoard: string): string[][] {
        const board: string[][] = [];
        const rows = fenBoard.split("/");
        for (const row of rows) {
            const boardRow: string[] = [];
            for (const char of row) {
                if (isNaN(Number(char))) {
                    boardRow.push(char);
                } else {
                    for (let i = 0; i < Number(char); i++) {
                        boardRow.push(".");
                    }
                }
            }
            board.push(boardRow);
        }
        return board;
    }

    public move(from: Position, to: Position, promotionPiece?: string): {
        captured: boolean,
        castling: boolean
    } | null {
        const piece = this.board[from.row][from.col];
        if (piece === "." || !this.isInBounds(to.row, to.col)) return null;

        const castlingRightsBefore = new Set(this.castlingRights);
        const captured = this.board[to.row][to.col];
        const isWhitePawn = piece === "P";
        const isBlackPawn = piece === "p";

        let actualCaptured = captured;
        if ((isWhitePawn || isBlackPawn) && this.lastMove && this.isEnpassantMove(from, to, this.lastMove)) {
            const capturedRow = isWhitePawn ? to.row + 1 : to.row - 1;
            actualCaptured = this.board[capturedRow][to.col];
            this.board[capturedRow][to.col] = ".";
        }

        let pieceToPlace = piece;
        const isPromotion = (isWhitePawn && to.row === 0) || (isBlackPawn && to.row === 7);
        if (isPromotion) {
            const promoteTo = (promotionPiece || "q").toLowerCase();
            pieceToPlace = isWhitePawn ? promoteTo.toUpperCase() : promoteTo;
        }

        this.board[to.row][to.col] = pieceToPlace;
        this.board[from.row][from.col] = ".";

        const isCastling = (piece === 'K' || piece === 'k') && Math.abs(from.col - to.col) === 2;
        if (isCastling) {
            const rookRow = from.row;
            if (to.col === 6) {
                this.board[rookRow][5] = this.board[rookRow][7];
                this.board[rookRow][7] = '.';
            } else if (to.col === 2) {
                this.board[rookRow][3] = this.board[rookRow][0];
                this.board[rookRow][0] = '.';
            }
        }

        if (piece === 'K') {
            this.castlingRights.delete('K');
            this.castlingRights.delete('Q');
        } else if (piece === 'k') {
            this.castlingRights.delete('k');
            this.castlingRights.delete('q');
        }
        if (piece === 'R') {
            if (from.row === 7 && from.col === 0) this.castlingRights.delete('Q');
            if (from.row === 7 && from.col === 7) this.castlingRights.delete('K');
        }
        if (piece === 'r') {
            if (from.row === 0 && from.col === 0) this.castlingRights.delete('q');
            if (from.row === 0 && from.col === 7) this.castlingRights.delete('k');
        }
        if (actualCaptured === 'R') {
            if (to.row === 7 && to.col === 0) this.castlingRights.delete('Q');
            if (to.row === 7 && to.col === 7) this.castlingRights.delete('K');
        }
        if (actualCaptured === 'r') {
            if (to.row === 0 && to.col === 0) this.castlingRights.delete('q');
            if (to.row === 0 && to.col === 7) this.castlingRights.delete('k');
        }

        const move: Move = {
            from,
            to,
            piece,
            captured: actualCaptured,
            castlingRightsBefore,
        };

        this.lastMove = move;
        this.moveLog.push(move);
        this.redoStack = [];

        this.updateGameState();

        return {captured: !!actualCaptured, castling: isCastling};
    }

    private updateGameState(): void {
        const turn = this.moveLog.length % 2 === 0 ? 'white' : 'black';
        const kingColor = turn === 'white' ? 'w' : 'b';

        this.isCheck = this.isKingInCheck(kingColor);
        if (this.isCheck) {
            this.checkKingPosition = this.findKing(kingColor);
        } else {
            this.checkKingPosition = null;
        }
        const hasValidMoves = this.getAllValidMoves(kingColor).length > 0;

        if (this.isCheck && !hasValidMoves) {
            this.isCheckmate = true;
            this.gameOver = true;
            this.winner = turn === 'white' ? 'black' : 'white';
        } else if (!this.isCheck && !hasValidMoves) {
            this.isStalemate = true;
            this.gameOver = true;
        } else if (this.isInsufficientMaterial() || this.isThreefoldRepetition() || this.halfMoveClock >= 100) {
            this.isDraw = true;
            this.gameOver = true;
        }
    }

    private boardToFen(): string {
        let fen = '';
        for (let i = 0; i < 8; i++) {
            let empty = 0;
            for (let j = 0; j < 8; j++) {
                const piece = this.board[i][j];
                if (piece === '.') {
                    empty++;
                } else {
                    if (empty > 0) {
                        fen += empty;
                        empty = 0;
                    }
                    fen += piece;
                }
            }
            if (empty > 0) {
                fen += empty;
            }
            if (i < 7) {
                fen += '/';
            }
        }
        return fen.split(' ')[0];
    }

    public isKingInCheck(kingColor: 'w' | 'b'): boolean {
        const kingPos = this.findKing(kingColor);
        if (!kingPos) return false;

        const opponentColor = kingColor === 'w' ? 'black' : 'white';
        const opponentPieces = this.getPieces(opponentColor);

        for (const {pos: piecePos} of opponentPieces) {
            const moves = this.getValidMoves(piecePos, true);
            for (const move of moves) {
                if (move.row === kingPos.row && move.col === kingPos.col) {
                    return true;
                }
            }
        }

        return false;
    }

    private findKing(color: 'w' | 'b'): Position | null {
        const kingPiece = color === 'w' ? 'K' : 'k';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c] === kingPiece) {
                    return {row: r, col: c};
                }
            }
        }
        return null;
    }

    private getPieces(color: 'white' | 'black'): { piece: string; pos: Position }[] {
        const pieces = [];
        const isWhite = color === 'white';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece !== '.') {
                    const pieceIsWhite = piece >= 'A' && piece <= 'Z';
                    if ((isWhite && pieceIsWhite) || (!isWhite && !pieceIsWhite)) {
                        pieces.push({piece, pos: {row: r, col: c}});
                    }
                }
            }
        }
        return pieces;
    }

    public getAllValidMoves(kingColor: 'w' | 'b'): Move[] {
        const allMoves: Move[] = [];
        const playerColor = kingColor === 'w' ? 'white' : 'black';
        const pieces = this.getPieces(playerColor);

        for (const {pos} of pieces) {
            const moves = this.getValidMoves(pos);
            // @ts-ignore
            allMoves.push(...moves.map(to => ({
                from: pos,
                to,
                piece: this.board[pos.row][pos.col],
                castlingRightsBefore: new Set()
            })));
        }
        return allMoves;
    }

    private isInsufficientMaterial(): boolean {
        const pieces = this.getPieces('white').concat(this.getPieces('black'));
        const pieceChars = pieces.map(p => p.piece.toLowerCase()).sort().join('');

        if (pieceChars === 'k') return true;
        if (pieceChars === 'kn' || pieceChars === 'kkn') return true;
        if (pieceChars === 'bk' || pieceChars === 'bkk') return true;
        if (pieceChars === 'bbkk') {
            const bishops = pieces.filter(p => p.piece.toLowerCase() === 'b');
            const squareColor1 = (bishops[0].pos.row + bishops[0].pos.col) % 2;
            const squareColor2 = (bishops[1].pos.row + bishops[1].pos.col) % 2;
            return squareColor1 === squareColor2;
        }

        return false;
    }

    private isThreefoldRepetition(): boolean {
        const fen = this.boardToFen();
        const count = this.history.filter(h => h.fen === fen).length;
        return count >= 2;
    }

    public undo(): void {
        if (this.moveLog.length === 0) return;

        const last = this.moveLog.pop()!;
        const {from, to, piece, captured, castlingRightsBefore} = last;

        this.board[from.row][from.col] = piece;
        this.board[to.row][to.col] = ".";

        const isCastling = (piece === 'K' || piece === 'k') && Math.abs(from.col - to.col) === 2;
        if (isCastling) {
            const rookRow = from.row;
            if (to.col === 6) {
                this.board[rookRow][7] = this.board[rookRow][5];
                this.board[rookRow][5] = '.';
            } else if (to.col === 2) {
                this.board[rookRow][0] = this.board[rookRow][3];
                this.board[rookRow][3] = '.';
            }
        }

        if (captured && captured !== ".") {
            if (
                (piece === "P" && from.row === 3 && to.row === 2 && Math.abs(from.col - to.col) === 1 && this.board[to.row][to.col] === '.') ||
                (piece === "p" && from.row === 4 && to.row === 5 && Math.abs(from.col - to.col) === 1 && this.board[to.row][to.col] === '.')
            ) {
                const capturedRow = piece === "P" ? to.row + 1 : to.row - 1;
                this.board[capturedRow][to.col] = captured;
            } else {
                this.board[to.row][to.col] = captured;
            }
        }

        this.castlingRights = castlingRightsBefore;
        this.redoStack.push(last);
        this.lastMove = this.moveLog[this.moveLog.length - 1] ?? null;
    }

    public redo(): void {
        if (this.redoStack.length === 0) return;

        const move = this.redoStack.pop()!;
        const {from, to, piece, captured} = move;


        if (
            (piece === "P" || piece === "p") &&
            this.lastMove &&
            this.isEnpassantMove(from, to, this.lastMove) &&
            captured &&
            captured !== "."
        ) {
            const capturedRow = piece === "P" ? to.row + 1 : to.row - 1;
            this.board[capturedRow][to.col] = ".";
        }

        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = ".";

        const isCastling = (piece === 'K' || piece === 'k') && Math.abs(from.col - to.col) === 2;
        if (isCastling) {
            const rookRow = from.row;
            if (to.col === 6) {
                this.board[rookRow][5] = this.board[rookRow][7];
                this.board[rookRow][7] = '.';
            } else if (to.col === 2) {
                this.board[rookRow][3] = this.board[rookRow][0];
                this.board[rookRow][0] = '.';
            }
        }

        if (piece === 'K') {
            this.castlingRights.delete('K');
            this.castlingRights.delete('Q');
        } else if (piece === 'k') {
            this.castlingRights.delete('k');
            this.castlingRights.delete('q');
        }
        if (piece === 'R' || captured === 'R') {
            if ((from.row === 7 && from.col === 0) || (to.row === 7 && to.col === 0)) this.castlingRights.delete('Q');
            if ((from.row === 7 && from.col === 7) || (to.row === 7 && to.col === 7)) this.castlingRights.delete('K');
        }
        if (piece === 'r' || captured === 'r') {
            if ((from.row === 0 && from.col === 0) || (to.row === 0 && to.col === 0)) this.castlingRights.delete('q');
            if ((from.row === 0 && from.col === 7) || (to.row === 0 && to.col === 7)) this.castlingRights.delete('k');
        }

        this.moveLog.push(move);
        this.lastMove = move;
    }

    private isInBounds(row: number, col: number): boolean {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    private isSquareAttacked(pos: Position, byColor: 'white' | 'black'): boolean {
        const isOpponentPiece = byColor === 'white' ? this.isWhitePiece : this.isBlackPiece;

        const pawnDirection = byColor === 'white' ? 1 : -1;
        const opponentPawn = byColor === 'white' ? 'P' : 'p';
        for (const dc of [-1, 1]) {
            const checkPos = {row: pos.row + pawnDirection, col: pos.col + dc};
            if (this.isInBounds(checkPos.row, checkPos.col) && this.board[checkPos.row][checkPos.col] === opponentPawn) {
                return true;
            }
        }

        const knightOffsets = [{dr: -2, dc: -1}, {dr: -2, dc: 1}, {dr: -1, dc: -2}, {dr: -1, dc: 2}, {
            dr: 1,
            dc: -2
        }, {dr: 1, dc: 2}, {dr: 2, dc: -1}, {dr: 2, dc: 1}];
        const opponentKnight = byColor === 'white' ? 'N' : 'n';
        for (const {dr, dc} of knightOffsets) {
            const checkPos = {row: pos.row + dr, col: pos.col + dc};
            if (this.isInBounds(checkPos.row, checkPos.col) && this.board[checkPos.row][checkPos.col] === opponentKnight) {
                return true;
            }
        }

        const slidingDirections = [{dr: -1, dc: 0}, {dr: 1, dc: 0}, {dr: 0, dc: -1}, {dr: 0, dc: 1}, {
            dr: -1,
            dc: -1
        }, {dr: -1, dc: 1}, {dr: 1, dc: -1}, {dr: 1, dc: 1}];
        const opponentRook = byColor === 'white' ? 'R' : 'r';
        const opponentBishop = byColor === 'white' ? 'B' : 'b';
        const opponentQueen = byColor === 'white' ? 'Q' : 'q';

        for (let i = 0; i < slidingDirections.length; i++) {
            const {dr, dc} = slidingDirections[i];
            let row = pos.row + dr;
            let col = pos.col + dc;
            while (this.isInBounds(row, col)) {
                const piece = this.board[row][col];
                if (piece !== '.') {
                    if (isOpponentPiece(piece)) {
                        const isRookDirection = i < 4;
                        const isBishopDirection = i >= 4;
                        if (piece === opponentQueen) return true;
                        if (isRookDirection && piece === opponentRook) return true;
                        if (isBishopDirection && piece === opponentBishop) return true;
                    }
                    break;
                }
                row += dr;
                col += dc;
            }
        }

        const kingOffsets = [{dr: -1, dc: -1}, {dr: -1, dc: 0}, {dr: -1, dc: 1}, {dr: 0, dc: -1}, {
            dr: 0,
            dc: 1
        }, {dr: 1, dc: -1}, {dr: 1, dc: 0}, {dr: 1, dc: 1}];
        const opponentKing = byColor === 'white' ? 'K' : 'k';
        for (const {dr, dc} of kingOffsets) {
            const checkPos = {row: pos.row + dr, col: pos.col + dc};
            if (this.isInBounds(checkPos.row, checkPos.col) && this.board[checkPos.row][checkPos.col] === opponentKing) {
                return true;
            }
        }

        return false;
    }

    private isWhitePiece(cell: string): boolean {
        return /[A-Z]/.test(cell);
    }

    private isBlackPiece(cell: string): boolean {
        return /[a-z]/.test(cell);
    }

    public isEnpassantMove(from: Position, to: Position, lastMove: Move): boolean {
        const piece = this.board[from.row][from.col];
        const isWhite = piece === 'P';
        if (!(piece === 'p' || isWhite)) return false;

        const direction = isWhite ? -1 : 1;
        if (Math.abs(from.col - to.col) !== 1 || to.row - from.row !== direction) {
            return false;
        }

        const opponentPawn = isWhite ? 'p' : 'P';
        return (
            lastMove.piece === opponentPawn &&
            Math.abs(lastMove.from.row - lastMove.to.row) === 2 &&
            lastMove.to.row === from.row &&
            lastMove.to.col === to.col
        );
    }

    public getValidMoves(pos: Position, forAttackCheck = false): Position[] {
        const piece = this.board[pos.row][pos.col];
        let moves: Position[];

        switch (piece) {
            case 'P':
                moves = this.getValidWhitePawnMoves(pos);
                break;
            case 'p':
                moves = this.getValidBlackPawnMoves(pos);
                break;
            case 'R':
            case 'r':
                moves = this.getValidRookMoves(pos);
                break;
            case 'B':
            case 'b':
                moves = this.getValidBishopMoves(pos);
                break;
            case 'Q':
            case 'q':
                moves = this.getValidQueenMoves(pos);
                break;
            case 'N':
            case 'n':
                moves = this.getValidKnightMoves(pos);
                break;
            case 'K':
            case 'k':
                moves = this.getValidKingMoves(pos);
                break;
            default:
                moves = [];
        }

        if (forAttackCheck) {
            return moves;
        }

        return moves.filter(to => {
            const kingColor = (piece >= 'A' && piece <= 'Z') ? 'w' : 'b';
            const originalPieceAtTo = this.board[to.row][to.col];
            this.board[pos.row][pos.col] = '.';
            this.board[to.row][to.col] = piece;

            const leavesKingInCheck = this.isKingInCheck(kingColor);

            this.board[pos.row][pos.col] = piece;
            this.board[to.row][to.col] = originalPieceAtTo;

            return !leavesKingInCheck;
        });
    }

    private getValidRookMoves(pos: Position): Position[] {
        return this.getSlidingMoves(pos, [
            {dr: -1, dc: 0}, {dr: 1, dc: 0}, {dr: 0, dc: -1}, {dr: 0, dc: 1}
        ]);
    }

    private getValidBishopMoves(pos: Position): Position[] {
        return this.getSlidingMoves(pos, [
            {dr: -1, dc: -1}, {dr: -1, dc: 1}, {dr: 1, dc: -1}, {dr: 1, dc: 1}
        ]);
    }

    private getValidQueenMoves(pos: Position): Position[] {
        return [
            ...this.getValidRookMoves(pos),
            ...this.getValidBishopMoves(pos),
        ];
    }

    private getValidKnightMoves(pos: Position): Position[] {
        const knightOffsets = [
            {dr: -2, dc: -1}, {dr: -2, dc: 1}, {dr: -1, dc: -2}, {dr: -1, dc: 2},
            {dr: 1, dc: -2}, {dr: 1, dc: 2}, {dr: 2, dc: -1}, {dr: 2, dc: 1}
        ];
        return this.getLeapingMoves(pos, knightOffsets);
    }

    private getValidKingMoves(pos: Position): Position[] {
        const kingOffsets: { dr: number; dc: number }[] = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr !== 0 || dc !== 0) kingOffsets.push({dr, dc});
            }
        }
        const moves = this.getLeapingMoves(pos, kingOffsets);

        const piece = this.board[pos.row][pos.col];
        const isWhite = this.isWhitePiece(piece);
        const kingRow = isWhite ? 7 : 0;
        const opponentColor = isWhite ? 'black' : 'white';

        if (pos.row !== kingRow || pos.col !== 4 || this.isSquareAttacked(pos, opponentColor)) {
            return moves;
        }

        const kingsideRight = isWhite ? 'K' : 'k';
        if (
            this.castlingRights.has(kingsideRight) &&
            this.board[kingRow][5] === '.' &&
            this.board[kingRow][6] === '.' &&
            !this.isSquareAttacked({row: kingRow, col: 5}, opponentColor) &&
            !this.isSquareAttacked({row: kingRow, col: 6}, opponentColor)
        ) {
            moves.push({row: kingRow, col: 6});
        }

        const queensideRight = isWhite ? 'Q' : 'q';
        if (
            this.castlingRights.has(queensideRight) &&
            this.board[kingRow][1] === '.' &&
            this.board[kingRow][2] === '.' &&
            this.board[kingRow][3] === '.' &&
            !this.isSquareAttacked({row: kingRow, col: 2}, opponentColor) &&
            !this.isSquareAttacked({row: kingRow, col: 3}, opponentColor)
        ) {
            moves.push({row: kingRow, col: 2});
        }

        return moves;
    }

    private getLeapingMoves(pos: Position, offsets: { dr: number; dc: number }[]): Position[] {
        const moves: Position[] = [];
        const piece = this.board[pos.row][pos.col];
        const isWhite = this.isWhitePiece(piece);

        for (const {dr, dc} of offsets) {
            const row = pos.row + dr;
            const col = pos.col + dc;
            if (this.isInBounds(row, col)) {
                const target = this.board[row][col];
                if (target === '.' || (isWhite ? this.isBlackPiece(target) : this.isWhitePiece(target))) {
                    moves.push({row, col});
                }
            }
        }
        return moves;
    }

    private getSlidingMoves(pos: Position, directions: { dr: number, dc: number }[]): Position[] {
        const moves: Position[] = [];
        const piece = this.board[pos.row][pos.col];
        const isWhite = this.isWhitePiece(piece);

        for (const {dr, dc} of directions) {
            let row = pos.row + dr;
            let col = pos.col + dc;
            while (this.isInBounds(row, col)) {
                const target = this.board[row][col];
                if (target === '.') {
                    moves.push({row, col});
                } else {
                    if (isWhite ? this.isBlackPiece(target) : this.isWhitePiece(target)) {
                        moves.push({row, col});
                    }
                    break;
                }
                row += dr;
                col += dc;
            }
        }
        return moves;
    }


    private getValidWhitePawnMoves({row, col}: Position): Position[] {
        const moves: Position[] = [];

        if (this.isInBounds(row - 1, col) && this.board[row - 1][col] === '.') {
            moves.push({row: row - 1, col});
            if (row === 6 && this.board[row - 2][col] === '.') {
                moves.push({row: row - 2, col});
            }
        }

        for (let dc of [-1, 1]) {
            const newRow = row - 1;
            const newCol = col + dc;
            if (
                this.isInBounds(newRow, newCol) &&
                this.isBlackPiece(this.board[newRow][newCol])
            ) {
                moves.push({row: newRow, col: newCol});
            }
        }

        if (row === 3 && this.lastMove) {
            for (let dc of [-1, 1]) {
                const target = {row: row - 1, col: col + dc};
                if (this.isInBounds(target.row, target.col) && this.isEnpassantMove({
                    row,
                    col
                }, target, this.lastMove)) {
                    moves.push(target);
                }
            }
        }

        return moves;
    }

    private getValidBlackPawnMoves({row, col}: Position): Position[] {
        const moves: Position[] = [];

        if (this.isInBounds(row + 1, col) && this.board[row + 1][col] === '.') {
            moves.push({row: row + 1, col});
            if (row === 1 && this.board[row + 2][col] === '.') {
                moves.push({row: row + 2, col});
            }
        }

        for (let dc of [-1, 1]) {
            const newRow = row + 1;
            const newCol = col + dc;
            if (
                this.isInBounds(newRow, newCol) &&
                this.isWhitePiece(this.board[newRow][newCol])
            ) {
                moves.push({row: newRow, col: newCol});
            }
        }

        if (row === 4 && this.lastMove) {
            for (let dc of [-1, 1]) {
                const target = {row: row + 1, col: col + dc};
                if (this.isInBounds(target.row, target.col) && this.isEnpassantMove({
                    row,
                    col
                }, target, this.lastMove)) {
                    moves.push(target);
                }
            }
        }

        return moves;
    }
}

export default ChessGame;