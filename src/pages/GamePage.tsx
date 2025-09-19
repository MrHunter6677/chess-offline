import { FaClock, FaFlag, FaHandshake, FaRedo, FaUndo } from "react-icons/fa";
import { FiGrid, FiList } from "react-icons/fi";
import ChessBoard from "../components/ChessBoard.tsx";
import React, { useRef, useState } from "react";
import { IoMdVolumeHigh } from "react-icons/io";
import type { Move } from "../hooks/ChessGame";
import { moveToSimpleSAN } from "../components/ChessBoard";
import { useTimer } from "../hooks/Timer";

export default function GamePage() {
    const [fen] = useState(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    );

    const [moveLog, setMoveLog] = useState<Move[]>([]);

    const [capturedWhite] = useState(["bp", "bp", "bn"]);
    const [capturedBlack] = useState(["wp", "wn"]);

    const [activeTab, setActiveTab] = useState<"moves" | "controls">(
        "controls"
    );
    const [soundPreset, setSoundPreset] = useState<
        "default" | "standard" | "piano" | "nes" | "silly" | "robot"
    >("default");

    const [turn, setTurn] = useState<"white" | "black">("white");
    const [gameOver, setGameOver] = useState(false);

    const whiteTimer = useTimer({ hours: 0, minutes: 10, seconds: 0 }, 1000, {
        onComplete: () => alert("White's time is up! Black wins!"),
    });
    const blackTimer = useTimer({ hours: 0, minutes: 10, seconds: 0 }, 1000, {
        onComplete: () => alert("Black's time is up! White wins!"),
    });

    React.useEffect(() => {
        if (turn === "white") {
            whiteTimer.startTimer();
            blackTimer.pauseTimer();
        } else {
            blackTimer.startTimer();
            whiteTimer.pauseTimer();
        }
    }, [turn]);

    function formatTime(t: {
        hours: number;
        minutes: number;
        seconds?: number;
    }) {
        const m = String(t.minutes + t.hours * 60).padStart(2, "0");
        const s = String(t.seconds ?? 0).padStart(2, "0");
        return `${m}:${s}`;
    }

    const chessBoardRef = useRef<any>(null);

    const PlayerInfo = ({
        name,
        time,
        capturedPieces,
        isActive = false,
    }: {
        name: string;
        time: string;
        capturedPieces: string[];
        isActive: boolean;
    }) => (
        <div
            className={`relative flex items-center justify-between px-4 py-3 bg-zinc-800/70 backdrop-blur-sm rounded-xl border border-zinc-700/80 transition-all duration-300 ${
                isActive
                    ? "shadow-[0_0_15px_#ffffff10,_inset_0_1px_1px_#ffffff10]"
                    : "shadow-[inset_0_1px_1px_#ffffff05]"
            }`}
        >
            {isActive && (
                <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-cyan-500/60 to-blue-500/60 blur-lg animate-pulse"></div>
            )}
            <div className="flex items-center gap-4 z-10">
                <img
                    src={`https://i.pravatar.cc/40?u=${name}`}
                    alt="avatar"
                    className="w-10 h-10 rounded-full border-2 border-zinc-600"
                />
                <div>
                    <div className="font-semibold text-white">
                        {name}{" "}
                        <span className="text-sm text-zinc-400 font-normal">
                            (1600)
                        </span>
                    </div>
                    <div className="flex gap-1.5 items-center mt-1">
                        {capturedPieces.map((p, i) => (
                            <img
                                key={i}
                                src={`/assets/pieces/classic/${p}.png`}
                                className="w-4 h-4 opacity-70"
                                alt="captured piece"
                            />
                        ))}
                    </div>
                </div>
            </div>
            <div
                className={`flex items-center gap-2 text-lg font-bold px-3 py-1 rounded-md z-10 ${
                    isActive ? "bg-white/10 text-white" : "text-zinc-400"
                }`}
            >
                <FaClock className="text-xl" />
                {time}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen w-full bg-zinc-900 text-white flex justify-center items-center p-4 font-sans">
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-[#1c1c1c]"></div>

            <div className="relative flex flex-col lg:flex-row w-full max-w-7xl gap-6 items-center lg:items-start justify-center">
                <div className="flex flex-col w-full max-w-[70vh] lg:max-w-auto lg:w-[65%] mx-auto gap-3">
                    <PlayerInfo
                        name="Opponent"
                        time={formatTime(blackTimer.timeRemaining)}
                        capturedPieces={capturedWhite}
                        isActive={turn === "black"}
                    />

                    <div className="relative aspect-square w-full rounded-lg shadow-2xl shadow-black/50">
                        <div className="absolute -inset-2 bg-gradient-to-br from-cyan-600/20 via-transparent to-blue-600/20 blur-2xl rounded-full"></div>
                        <div className="relative w-full h-full border-2 border-zinc-700/50 rounded-lg overflow-hidden">
                            <ChessBoard
                                ref={chessBoardRef}
                                fen={fen}
                                boardSize="100%"
                                backgroundColor="transparent"
                                board={{
                                    boardTheme: "preset",
                                    boardPreset: "walnut",
                                    boardLabelColor1: "#e0e0e0",
                                    boardLabelColor2: "#b0b0b0",
                                }}
                                pieces={{
                                    piecesTheme: "preset",
                                    piecesPreset: "classic",
                                }}
                                validSqaureHintColor={"rgba(0,0,0,0.4)"}
                                lastMoveSquareColor={"rgba(255,150,0,0.4)"}
                                sound={{ soundPreset }}
                                moveLog={moveLog}
                                onMoveLogChange={setMoveLog}
                                turn={turn}
                                onTurnChange={setTurn}
                            />
                        </div>
                    </div>

                    <PlayerInfo
                        name="You"
                        time={formatTime(whiteTimer.timeRemaining)}
                        capturedPieces={capturedBlack}
                        isActive={turn === "white"}
                    />
                </div>

                <div className="flex flex-col gap-4 w-full lg:w-[35%] max-w-sm">
                    <div className="bg-zinc-800/70 backdrop-blur-sm rounded-xl border border-zinc-700/80 shadow-lg h-[80vh] max-h-[730px] flex flex-col">
                        <div className="flex p-2 bg-zinc-900/50 rounded-t-xl border-b border-zinc-700">
                            <button
                                onClick={() => setActiveTab("moves")}
                                className={`w-1/2 flex items-center justify-center gap-2 p-3 rounded-lg font-semibold transition-colors ${
                                    activeTab === "moves"
                                        ? "bg-zinc-700 text-white"
                                        : "text-zinc-400 hover:bg-zinc-700/50"
                                }`}
                            >
                                <FiList /> Move Log
                            </button>
                            <button
                                onClick={() => setActiveTab("controls")}
                                className={`w-1/2 flex items-center justify-center gap-2 p-3 rounded-lg font-semibold transition-colors ${
                                    activeTab === "controls"
                                        ? "bg-zinc-700 text-white"
                                        : "text-zinc-400 hover:bg-zinc-700/50"
                                }`}
                            >
                                <FiGrid /> Controls
                            </button>
                        </div>

                        <div className="flex-grow p-4 overflow-y-auto custom-scroll">
                            {activeTab === "moves" && (
                                <div className="text-base text-zinc-300 space-y-2">
                                    {Array.from({
                                        length: Math.ceil(moveLog.length / 2),
                                    }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="grid grid-cols-[30px_1fr_1fr] items-center hover:bg-white/5 rounded-md px-2 py-1.5 transition-colors"
                                        >
                                            <span className="font-mono text-zinc-500">
                                                {i + 1}.
                                            </span>
                                            <span className="font-semibold text-white">
                                                {moveLog[i * 2]
                                                    ? moveToSimpleSAN(
                                                          moveLog[i * 2]
                                                      )
                                                    : ""}
                                            </span>
                                            {moveLog[i * 2 + 1] && (
                                                <span className="font-semibold text-zinc-300">
                                                    {moveLog[i * 2 + 1]
                                                        ? moveToSimpleSAN(
                                                              moveLog[i * 2 + 1]
                                                          )
                                                        : ""}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === "controls" && (
                                <div className="flex flex-col gap-4">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <button
                                            className="bg-zinc-700 hover:bg-zinc-600/80 transition-all text-white p-3 rounded-lg font-medium flex items-center justify-center gap-2 ring-1 ring-zinc-600 hover:ring-zinc-500"
                                            onClick={() =>
                                                chessBoardRef.current?.undo()
                                            }
                                        >
                                            <FaUndo /> Undo
                                        </button>
                                        <button
                                            className="bg-zinc-700 hover:bg-zinc-600/80 transition-all text-white p-3 rounded-lg font-medium flex items-center justify-center gap-2 ring-1 ring-zinc-600 hover:ring-zinc-500"
                                            onClick={() =>
                                                chessBoardRef.current?.redo()
                                            }
                                        >
                                            <FaRedo /> Redo
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
