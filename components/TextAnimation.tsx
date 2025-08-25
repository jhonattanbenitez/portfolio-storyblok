import { TypeAnimation } from "react-type-animation";
import { FC } from "react";

interface TextAnimationProps {
  list: { item: string; _uid: string; component: string }[]; // Use the same list type as SBHeroData
}

const TextAnimation: FC<TextAnimationProps> = ({ list }) => {
  // Generate the sequence dynamically from the list
  const sequence = list.flatMap((item) => [item.item, 3000]); // Add each item and a 3-second pause

  return (
    <TypeAnimation
      sequence={sequence}
      wrapper="span"
      speed={20}
      repeat={Infinity}
      className="text-blue-600 dark:text-blue-400"
    />
  );
};

export default TextAnimation;
