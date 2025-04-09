import type { ChatSettings } from "~/types/chat";

export const initialChatSettings: ChatSettings = {
  initialMessage: "",
  suggestedQuestions: [],
  intro: { title: "", subTitle: "" },
  textAreaInitialRows: 2,
  footerNote: "",
  enableFileUpload: false,
  showMessageToolBar: false,
  showDefaultToolsDebugMessages: false,
  openExternalLinksInNewTab: true,
  openInternalLinksInNewTab: false,
  openYoutubeVideosInIframe: false,
};