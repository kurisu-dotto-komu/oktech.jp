import type { ReactNode } from "react";

import { animated, useTransition } from "@react-spring/web";

export default function AnimatedExpander<T extends { id: string }>({
  items,
  expanded,
  renderItem,
}: {
  items: T[];
  expanded: boolean;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  const transitions = useTransition(expanded ? items : [], {
    keys: (item) => item.id,
    from: { opacity: 0, transform: "translateY(-20px)" },
    enter: { opacity: 1, transform: "translateY(0px)" },
    trail: 50,
    config: { tension: 300, friction: 20 },
  });

  return transitions((style, item, _, index) => (
    <animated.div key={item.id} style={style}>
      {renderItem(item, index)}
    </animated.div>
  ));
}
