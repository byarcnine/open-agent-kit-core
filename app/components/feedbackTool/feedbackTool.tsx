import "./feedbackTool.scss";

interface FeedbackToolProps {
  result: { success?: boolean };
}

const FeedbackTool = ({ result }: FeedbackToolProps) => {
  const { success = false } = result || {};
  return (
    <div className="feedback-tool">
      <span>
        {success
          ? "Thank you for your feedback!"
          : "This agent does not capture feedback."}
      </span>
    </div>
  );
};

export default FeedbackTool;
