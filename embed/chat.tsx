import { createRoot } from "react-dom/client";
import ChatComponent, { type ChatComponentType } from "../chat_module";


// Function to render the component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderChatComponent(
  divId: string,
  config: ChatComponentType
) {
  const container = document.getElementById(divId);
  if (container) {
    const root = createRoot(container);
    root.render(<ChatComponent {...config} />);
  } else {
    console.error(`No element found with ID: ${divId}`);
  }
}
