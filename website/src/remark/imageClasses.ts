import type {Paragraph, Root, Text} from 'mdast';
import type {Plugin} from 'unified';
import {visit} from 'unist-util-visit';

const ATTRIBUTES = /^\{\s*((?:\.?[\w-]+\s*)+)\}/;

// Docusaurus swaps image nodes for JSX and drops their hProperties, so the classes from
// `![alt](shot.png){ .screenshot screenshot--dialog }` go on the paragraph instead.
const imageClasses: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'paragraph', (paragraph: Paragraph) => {
    const [image, trailing] = paragraph.children;
    if (image?.type !== 'image' || trailing?.type !== 'text') return;

    const match = ATTRIBUTES.exec(trailing.value);
    if (!match) return;

    const classes = match[1].split(/\s+/).filter(Boolean).map((name) => name.replace(/^\./, ''));
    (trailing as Text).value = trailing.value.slice(match[0].length);
    paragraph.data = {...paragraph.data, hProperties: {className: classes}};
  });
};

export default imageClasses;
