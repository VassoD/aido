interface AnswerListProps {
  answers: { question: string; answer: string }[];
}

export function AnswerList({ answers }: AnswerListProps): React.ReactElement | null {
  if (answers.length === 0) return null;
  return (
    <dl className="flex flex-col gap-2">
      {answers.map((entry) => (
        <div key={entry.question}>
          <dt className="text-sm text-muted">{entry.question}</dt>
          <dd className="text-text">{entry.answer}</dd>
        </div>
      ))}
    </dl>
  );
}
