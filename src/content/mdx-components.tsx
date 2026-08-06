import type { MDXComponents } from "mdx/types";
import { CodeBlock } from "@/components/lessons/code-block";
import { Quiz } from "@/components/lessons/quiz";
import { Prediction } from "@/components/lessons/prediction";
import { Solution } from "@/components/lessons/solution";
import { Step } from "@/components/lessons/step";
import { ArrangeCode } from "@/components/activities/arrange-code";
import { ChooseBuild } from "@/components/activities/choose-build";
import { FillBlank } from "@/components/activities/fill-blank";
import { FixBug } from "@/components/activities/fix-bug";
import { Mcq } from "@/components/activities/mcq";
import { PredictOutput } from "@/components/activities/predict-output";
import { Variant } from "@/components/activities/variant";
import { WriteCode } from "@/components/activities/write-code";
import {
  Callout,
  Challenge,
  Expandable,
  MdxHeading,
  MdxLink,
  Mistake,
  Note,
  Tip,
  Warning,
} from "@/components/lessons/mdx-extras";

/**
 * Every custom component available inside lesson MDX files.
 * Adding a component here makes it usable in any lesson with `<Component />`.
 */
export const mdxComponents: MDXComponents = {
  pre: CodeBlock,
  a: MdxLink,
  h2: (props) => <MdxHeading level={2} {...props} />,
  h3: (props) => <MdxHeading level={3} {...props} />,
  h4: (props) => <MdxHeading level={4} {...props} />,
  Callout,
  Challenge,
  Expandable,
  Note,
  Tip,
  Warning,
  Mistake,
  Quiz,
  Prediction,
  Solution,
  Step,
  Mcq,
  FillBlank,
  WriteCode,
  PredictOutput,
  FixBug,
  ArrangeCode,
  ChooseBuild,
  Variant,
};
