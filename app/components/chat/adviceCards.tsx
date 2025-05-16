import React from "react";

interface AdviceCardsProps {
  questions: string[];
  className?: string;
  onCardSelect: (question: string) => void;
}

const AdviceCards: React.FC<AdviceCardsProps> = React.memo(
  ({ className = "", questions, onCardSelect }) => (
    <div className={`oak-chat__advice-badges ${className}`}>
      {questions.map((question, index) => (
        <div
          key={index}
          className="oak-chat__advice-badges-card"
          onClick={() => onCardSelect(question)}
        >
          <h4 className="oak-chat__advice-badges-card-title">
            {question}
          </h4>
        </div>
      ))}
    </div>
  )
);

export default React.memo(AdviceCards);
