import { memo, useEffect, useState } from 'react';
import { Markdown } from './Markdown';

interface AssistantMessageProps {
  content: string;
}

export const AssistantMessage = memo(({ content }: AssistantMessageProps) => {
  const [processedContent, setProcessedContent] = useState(content);

  useEffect(() => {
    // Check if this is a system prompt message (contains system_constraints and other prompt markers)
    if (content.includes('<system_constraints>') ||
        content.includes('<character_traits>') ||
        content.includes('<core_skills>') ||
        content.includes('<environment_preferences>') ||
        content.includes('<artifact_instructions>')) {
      // Don't display system prompt messages at all
      setProcessedContent('');
    } else {
      setProcessedContent(content);
    }
  }, [content]);

  // Don't render anything if there's no processed content
  if (!processedContent) {
    return null;
  }

  return (
    <div className="overflow-hidden w-full">
      <Markdown html>{processedContent}</Markdown>
    </div>
  );
});
