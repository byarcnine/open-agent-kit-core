const ChatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    className="oak-chat-widget__icon"
    aria-hidden="true"
  >
    <defs>
      <mask id="cutout-mask">
        <rect width="40" height="40" fill="currentColor" />
        <g transform="translate(13.7,2) scale(0.5)">
          <path
            d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z"
            fill="black"
          />
        </g>
        <g transform="translate(13,8) scale(0.2)">
          <path
            d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z"
            fill="black"
          />
        </g>
      </mask>
    </defs>
    <path
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      fill="currentColor"
      mask="url(#cutout-mask)"
    />
  </svg>
);

export default ChatIcon;