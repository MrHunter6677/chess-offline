import GamePage from "./pages/GamePage.tsx";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

function App() {
  const app = false;
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-screen h-screen bg-[#302e2b] font-sans">
        <GamePage />
      </div>
    </DndProvider>
  );
}

export default App;
