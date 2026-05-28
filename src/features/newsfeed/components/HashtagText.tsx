import React from 'react';

interface Props {
  text: string;
}

/**
 * Renders text with hashtags highlighted in blue.
 */
export const HashtagText: React.FC<Props> = ({ text }) => {
  if (!text) return null;

  // Split by whitespace to find hashtags more accurately
  const parts = text.split(/(#\w+)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('#') && part.length > 1) {
          return (
            <span key={i} className="text-blue-500 font-medium hover:underline cursor-pointer">
              {part}
            </span>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
};
