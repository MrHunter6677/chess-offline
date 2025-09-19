import React, {
  forwardRef,
  type ReactNode,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import ChessGame, { type Move, type Position } from "../hooks/ChessGame";
import type { PanInfo } from "motion";

type BoardProps =
  | {
      boardTheme: "preset";
      boardPreset:
        | "8_bit"
        | "bases"
        | "blue"
        | "brown"
        | "bubblegum"
        | "burled_wood"
        | "dark_wood"
        | "dash"
        | "glass"
        | "graffiti"
        | "green"
        | "icy_sea"
        | "light"
        | "lolz"
        | "marble"
        | "metal"
        | "neon"
        | "newspaper"
        | "orange"
        | "overlay"
        | "parchment"
        | "purple"
        | "red"
        | "sand"
        | "sky"
        | "stone"
        | "tan"
        | "tournament"
        | "translucent"
        | "walnut";
      boardLabelColor1: string;
      boardLabelColor2: string;
    }
  | {
      boardTheme: "color";
      boardLightSquareColor: string;
      boardDarkSquareColor: string;
    };

type PiecesProps = {
  piecesTheme: "preset";
  piecesPreset:
    | "3d_chesskid"
    | "3d_plastic"
    | "3d_staunton"
    | "3d_wood"
    | "8_bit"
    | "alpha"
    | "bases"
    | "blindfold"
    | "book"
    | "bubblegum"
    | "cases"
    | "classic"
    | "club"
    | "condal"
    | "dash"
    | "game_room"
    | "glass"
    | "gothic"
    | "graffiti"
    | "icy_sea"
    | "light"
    | "lolz"
    | "marble"
    | "maya"
    | "metal"
    | "modern"
    | "nature"
    | "neo"
    | "neon"
    | "neo_wood"
    | "newspaper"
    | "ocean"
    | "sky"
    | "space"
    | "tigers"
    | "tournament"
    | "vintage"
    | "wood";
};

type SoundProps = {
  soundPreset: "default" | "standard" | "piano" | "nes" | "silly" | "robot";
};

interface ChessBoardProps {
  boardSize: string;
  fen: string;
  backgroundColor: string;
  board: BoardProps;
  pieces: PiecesProps;
  sound: SoundProps;
  validSqaureHintColor: string;
  lastMoveSquareColor: string;
  moveLog: Move[];
  onMoveLogChange: (log: Move[]) => void;
  turn: "white" | "black";
  onTurnChange: (turn: "white" | "black") => void;
}

const ChessBoard = forwardRef(function ChessBoard(props: ChessBoardProps, ref) {
  const [game] = useState(() => new ChessGame(props.fen));

  const playSound = (
    type: "move" | "capture" | "check" | "castle" | "promote" | "game_end"
  ) => {
    let url = "";
    if (props.sound.soundPreset === "default") {
      if (type === "move") {
        url =
          "http://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3";
      } else if (type === "capture") {
        url =
          "http://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3";
      } else if (type === "castle") {
        url =
          "http://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3";
      } else {
        url = `/assets/sounds/${props.sound.soundPreset}/${type}.mp3`;
      }
    } else {
      url = `/assets/sounds/${props.sound.soundPreset}/${type}.mp3`;
    }
    const audio = new Audio(url);
    audio.play().catch((e) => console.error("Error playing sound:", e));
  };
  const [board, setBoard] = useState<string[][]>(
    game.board.map((row) => [...row])
  );

  const columnLabels = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const rowLabels = ["8", "7", "6", "5", "4", "3", "2", "1"];

  const boardRef = useRef<HTMLDivElement>(null);

  const [draggingPiece, setDraggingPiece] = useState<{
    piece: string;
    from: Position;
    to: Position;
    fromPx: { x: number; y: number };
    toPx: { x: number; y: number };
    isPromotion: boolean;
    isValidMove: boolean;
  } | null>(null);

  const [animatingRook, setAnimatingRook] = useState<{
    piece: string;
    from: Position;
    fromPx: { x: number; y: number };
    toPx: { x: number; y: number };
  } | null>(null);

  const [validTargets, setValidTargets] = useState<Position[]>([]);
  const [disableInteraction, setDisableInteraction] = useState(false);

  const [promotion, setPromotion] = useState<{
    from: Position;
    to: Position;
    color: "w" | "b";
  } | null>(null);

  const [promotionSquarePx, setPromotionSquarePx] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [lastMove, setLastMove] = useState<Move | null>(game.lastMove);
  const [checkKingPosition, setCheckKingPosition] = useState<Position | null>(
    game.checkKingPosition
  );
  const [gameStatus, setGameStatus] = useState({
    gameOver: game.gameOver,
    winner: game.winner,
    isCheckmate: game.isCheckmate,
    isStalemate: game.isStalemate,
    isDraw: game.isDraw,
  });

  const [selected, setSelected] = useState<Position | null>(null);

  const handleDragStart = (from: Position) => {
    if (disableInteraction) return;

    const piece = board[from.row][from.col];
    const pieceColor = piece >= "a" && piece <= "z" ? "black" : "white";

    if (props.turn === pieceColor) {
      setSelected(from);
      setValidTargets(game.getValidMoves(from));
    } else {
      setValidTargets([]);
    }
  };

  const handleDragEnd = (info: PanInfo, from: Position) => {
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect || !validTargets) return;

    const squareSize = boardRect.width / 8;
    const toCol = Math.floor((info.point.x - boardRect.left) / squareSize);
    const toRow = Math.floor((info.point.y - boardRect.top) / squareSize);
    const to = { row: toRow, col: toCol };

    const piece = board[from.row][from.col];

    const isValidMove = validTargets.some(
      (pos) => pos.row === toRow && pos.col === toCol
    );

    const isPromotion =
      isValidMove &&
      ((piece === "P" && toRow === 0) || (piece === "p" && toRow === 7));

    const isCastling =
      isValidMove &&
      (piece === "K" || piece === "k") &&
      Math.abs(from.col - to.col) === 2;
    if (isCastling) {
      const rookRow = from.row;
      const rookFromCol = to.col === 6 ? 7 : 0;
      const rookToCol = to.col === 6 ? 5 : 3;
      const rookPiece = board[rookRow][rookFromCol];

      setAnimatingRook({
        piece: rookPiece,
        from: { row: rookRow, col: rookFromCol },
        fromPx: { x: rookFromCol * squareSize, y: rookRow * squareSize },
        toPx: { x: rookToCol * squareSize, y: rookRow * squareSize },
      });
    }

    const fromPx = { x: from.col * squareSize, y: from.row * squareSize };
    const dragEndPx = {
      x: fromPx.x + info.offset.x,
      y: fromPx.y + info.offset.y,
    };
    const toPx = isValidMove
      ? { x: toCol * squareSize, y: toRow * squareSize }
      : fromPx;

    setDraggingPiece({
      piece,
      from,
      to,
      fromPx: dragEndPx,
      toPx,
      isPromotion,
      isValidMove,
    });

    setDisableInteraction(true);
    setValidTargets([]);
    setSelected(null);
  };

  const onAnimationComplete = () => {
    if (!draggingPiece) return;
    if (draggingPiece.isPromotion) {
      setPromotion({
        from: draggingPiece.from,
        to: draggingPiece.to,
        color: draggingPiece.piece === "P" ? "w" : "b",
      });
      setPromotionSquarePx(draggingPiece.toPx);
      return;
    }
    if (draggingPiece.isValidMove) {
      const moveResult = game.move(draggingPiece.from, draggingPiece.to);
      if (moveResult) {
        setBoard(game.board.map((row) => [...row]));
        setLastMove(game.lastMove);
        props.onMoveLogChange(game.moveLog.slice());
        const nextTurn = props.turn === "white" ? "black" : "white";
        props.onTurnChange(nextTurn);
        if (game.isCheck) playSound("check");
        else if (moveResult.captured) playSound("capture");
        else if (moveResult.castling) playSound("castle");
        else playSound("move");
      }
    }
    setDraggingPiece(null);
    setAnimatingRook(null);
    setDisableInteraction(false);
    setCheckKingPosition(game.checkKingPosition);
    setGameStatus({
      gameOver: game.gameOver,
      winner: game.winner,
      isCheckmate: game.isCheckmate,
      isStalemate: game.isStalemate,
      isDraw: game.isDraw,
    });
    if (game.gameOver) {
      playSound("game_end");
    }
  };

  function handlePromotionSelect(promotedPiece: string) {
    if (!promotion) return;
    const moved = game.move(promotion.from, promotion.to, promotedPiece);
    if (moved) {
      setBoard(game.board.map((row) => [...row]));
      setLastMove(game.lastMove);
      props.onMoveLogChange(game.moveLog.slice());
      const nextTurn = props.turn === "white" ? "black" : "white";
      props.onTurnChange(nextTurn);
      playSound("promote");
    }
    setPromotion(null);
    setPromotionSquarePx(null);
    setDraggingPiece(null);
    setDisableInteraction(false);
    setCheckKingPosition(game.checkKingPosition);
    setGameStatus({
      gameOver: game.gameOver,
      winner: game.winner,
      isCheckmate: game.isCheckmate,
      isStalemate: game.isStalemate,
      isDraw: game.isDraw,
    });
    if (game.gameOver) {
      playSound("game_end");
    }
  }

  function handleSquareClick(row: number, col: number) {
    if (disableInteraction) return;
    const piece = board[row][col];
    const pieceColor = piece >= "a" && piece <= "z" ? "black" : "white";
    if (
      selected &&
      validTargets.some((pos) => pos.row === row && pos.col === col)
    ) {
      const from = selected;
      const to = { row, col };
      const movingPiece = board[from.row][from.col];
      const isPromotion =
        (movingPiece === "P" && row === 0) ||
        (movingPiece === "p" && row === 7);
      if (isPromotion) {
        setPromotion({ from, to, color: movingPiece === "P" ? "w" : "b" });
        setPromotionSquarePx({
          x: (col * (boardRef.current?.getBoundingClientRect().width ?? 0)) / 8,
          y: (row * (boardRef.current?.getBoundingClientRect().width ?? 0)) / 8,
        });
        setSelected(null);
        setValidTargets([]);
        setDisableInteraction(true);
        return;
      }
      const moveResult = game.move(from, to);
      if (moveResult) {
        setBoard(game.board.map((row) => [...row]));
        setLastMove(game.lastMove);
        props.onMoveLogChange(game.moveLog.slice());
        const nextTurn = props.turn === "white" ? "black" : "white";
        props.onTurnChange(nextTurn);
        if (game.isCheck) playSound("check");
        else if (moveResult.captured) playSound("capture");
        else if (moveResult.castling) playSound("castle");
        else playSound("move");
      }
      setSelected(null);
      setValidTargets([]);
      setCheckKingPosition(game.checkKingPosition);
      setGameStatus({
        gameOver: game.gameOver,
        winner: game.winner,
        isCheckmate: game.isCheckmate,
        isStalemate: game.isStalemate,
        isDraw: game.isDraw,
      });
      if (game.gameOver) playSound("game_end");
      return;
    }
    if (piece !== "." && props.turn === pieceColor) {
      setSelected({ row, col });
      setValidTargets(game.getValidMoves({ row, col }));
    } else {
      setSelected(null);
      setValidTargets([]);
    }
  }

  function renderSquares() {
    const squares: ReactNode[] = [];
    for (let i = 0; i < 8; i++) {
      let isWhite = i % 2 === 0;
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        const pieceImage =
          piece >= "a" && piece <= "z"
            ? "b" + piece
            : "w" + piece.toLowerCase();

        const isKingHidden =
          draggingPiece &&
          draggingPiece.from.row === i &&
          draggingPiece.from.col === j;

        const isRookHidden =
          animatingRook &&
          animatingRook.from.row === i &&
          animatingRook.from.col === j;

        const isPieceHidden = isKingHidden || isRookHidden;

        const isLastMoveFrom =
          lastMove?.from.row === i && lastMove?.from.col === j;
        const isLastMoveTo = lastMove?.to.row === i && lastMove?.to.col === j;
        const isKingInCheck =
          checkKingPosition &&
          checkKingPosition.row === i &&
          checkKingPosition.col === j;
        const isEnpassantCapture =
          selected && lastMove
            ? game.isEnpassantMove(selected, { row: i, col: j }, lastMove)
            : false;
        squares.push(
          <div
            key={`${i}-${j}`}
            className={`flex w-full h-full relative justify-center items-center`}
            style={
              props.board.boardTheme === "color"
                ? {
                    backgroundColor: isWhite
                      ? props.board.boardLightSquareColor
                      : props.board.boardDarkSquareColor,
                  }
                : {
                    backgroundImage: isWhite
                      ? `url("/assets/boards/${props.board.boardPreset}/tile_1.png")`
                      : `url("/assets/boards/${props.board.boardPreset}/tile_2.png")`,
                  }
            }
            onClick={() => handleSquareClick(i, j)}
          >
            {i === 7 && (
              <div
                className="absolute bottom-[2px] right-[3px] rounded-sm font-semibold"
                style={{
                  color:
                    props.board.boardTheme === "preset"
                      ? isWhite
                        ? props.board.boardLabelColor1
                        : props.board.boardLabelColor2
                      : isWhite
                      ? props.board.boardDarkSquareColor
                      : props.board.boardLightSquareColor,
                  fontSize: "clamp(0.6rem, 1.5vw, 1rem)",
                }}
              >
                {columnLabels[j]}
              </div>
            )}

            {j === 0 && (
              <div
                className="absolute top-[2px] left-[3px] rounded-sm font-semibold"
                style={{
                  color:
                    props.board.boardTheme === "preset"
                      ? isWhite
                        ? props.board.boardLabelColor1
                        : props.board.boardLabelColor2
                      : isWhite
                      ? props.board.boardDarkSquareColor
                      : props.board.boardLightSquareColor,
                  fontSize: "clamp(0.6rem, 1.5vw, 1rem)",
                }}
              >
                {rowLabels[i]}
              </div>
            )}
            {validTargets.some((pos) => pos.row === i && pos.col === j) &&
              (board[i][j] === "." && !isEnpassantCapture ? (
                <div className="absolute inset-0 flex justify-center items-center">
                  <div
                    className="w-4 h-4 rounded-full pointer-events-none"
                    style={{ backgroundColor: props.validSqaureHintColor }}
                  />
                </div>
              ) : (
                <div
                  className="absolute w-[85%] h-[85%] rounded-full border-[10px] z-[5]"
                  style={{
                    borderColor: props.validSqaureHintColor,
                    backgroundColor: "transparent",
                  }}
                />
              ))}

            {isKingInCheck && (
              <motion.div
                className="absolute w-full h-full z-[4]"
                style={{ backgroundColor: "rgba(255, 0, 0, 0.5)" }}
              />
            )}

            {(isLastMoveFrom || isLastMoveTo) && (
              <motion.div
                className="absolute w-full h-full z-[5]"
                initial={{
                  backgroundColor: "rgba(0, 0, 0, 0)",
                }}
                animate={{
                  backgroundColor: props.lastMoveSquareColor,
                }}
                transition={{
                  duration: 0.3,
                  ease: "easeIn",
                }}
              />
            )}

            {piece !== "." && (
              <motion.img
                drag={!disableInteraction}
                dragSnapToOrigin={true}
                onDragStart={() => handleDragStart({ row: i, col: j })}
                onDragEnd={(e, info) => handleDragEnd(info, { row: i, col: j })}
                className="z-10 cursor-grab active:cursor-grabbing"
                src={`/assets/pieces/${props.pieces.piecesPreset}/${pieceImage}.png`}
                style={{
                  width: "100%",
                  height: "100%",
                  opacity: isPieceHidden ? 0 : 1,
                }}
              />
            )}
          </div>
        );
        isWhite = !isWhite;
      }
    }
    return squares;
  }

  useImperativeHandle(ref, () => ({
    undo: () => {
      game.undo();
      setBoard(game.board.map((row) => [...row]));
      setLastMove(game.lastMove);
      props.onMoveLogChange(game.moveLog.slice());
      const nextTurn = game.moveLog.length % 2 === 0 ? "white" : "black";
      props.onTurnChange(nextTurn);
    },
    redo: () => {
      game.redo();
      setBoard(game.board.map((row) => [...row]));
      setLastMove(game.lastMove);
      props.onMoveLogChange(game.moveLog.slice());
      const nextTurn = game.moveLog.length % 2 === 0 ? "white" : "black";
      props.onTurnChange(nextTurn);
    },
  }));

  return (
    <div
      ref={boardRef}
      className="grid grid-cols-8 grid-rows-8 aspect-square relative"
      style={{ width: props.boardSize, backgroundColor: props.backgroundColor }}
    >
      {draggingPiece && (
        <motion.img
          src={`/assets/pieces/${props.pieces.piecesPreset}/${
            draggingPiece.piece >= "a" && draggingPiece.piece <= "z"
              ? "b" + draggingPiece.piece
              : "w" + draggingPiece.piece.toLowerCase()
          }.png`}
          className="absolute pointer-events-none z-50"
          initial={{ x: draggingPiece.fromPx.x, y: draggingPiece.fromPx.y }}
          animate={{ x: draggingPiece.toPx.x, y: draggingPiece.toPx.y }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          style={{ width: `${100 / 8}%`, height: `${100 / 8}%` }}
          onAnimationComplete={onAnimationComplete}
        />
      )}

      {animatingRook && (
        <motion.img
          src={`/assets/pieces/${props.pieces.piecesPreset}/${
            animatingRook.piece >= "a" && animatingRook.piece <= "z"
              ? "b" + animatingRook.piece
              : "w" + animatingRook.piece.toLowerCase()
          }.png`}
          className="absolute pointer-events-none z-50"
          initial={{ x: animatingRook.fromPx.x, y: animatingRook.fromPx.y }}
          animate={{ x: animatingRook.toPx.x, y: animatingRook.toPx.y }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          style={{ width: `${100 / 8}%`, height: `${100 / 8}%` }}
        />
      )}

      {promotion && promotionSquarePx && (
        <div
          className="absolute z-50 flex flex-col items-center"
          style={{
            left: promotionSquarePx.x,
            top:
              promotion.color === "w"
                ? Math.min(
                    promotionSquarePx.y,
                    (boardRef.current?.getBoundingClientRect().width ?? 0) -
                      ((boardRef.current?.getBoundingClientRect().width ?? 0) /
                        8) *
                        4
                  )
                : Math.max(
                    promotionSquarePx.y -
                      ((boardRef.current?.getBoundingClientRect().width ?? 0) /
                        8) *
                        3,
                    0
                  ),
            flexDirection:
              promotion.color === "w" ? "column" : "column-reverse",
            width: `${100 / 8}%`,
            height: `${(100 / 8) * 4}%`,
          }}
        >
          {["q", "r", "b", "n"].map((p) => (
            <button
              key={p}
              className="bg-white/90 hover:bg-yellow-200 border border-gray-400 w-full flex-1"
              onClick={() => handlePromotionSelect(p)}
            >
              <img
                src={`/assets/pieces/${props.pieces.piecesPreset}/${promotion.color}${p}.png`}
                alt={promotion.color + p}
                className="w-full h-full object-contain"
              />
            </button>
          ))}
        </div>
      )}

      {renderSquares()}

      {gameStatus.gameOver && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {gameStatus.isCheckmate
                ? `Checkmate! ${
                    gameStatus.winner?.charAt(0).toUpperCase() +
                    gameStatus.winner?.slice(1)
                  } wins!`
                : gameStatus.isStalemate
                ? "Stalemate!"
                : "Draw!"}
            </h2>
            <p className="mb-6">
              {gameStatus.isDraw
                ? "The game is a draw by threefold repetition or the fifty-move rule."
                : "What would you like to do next?"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export function moveToSimpleSAN(move: Move): string {
  const files = "abcdefgh";
  return `${files[move.from.col]}${8 - move.from.row}${files[move.to.col]}${
    8 - move.to.row
  }`;
}

export default ChessBoard;
