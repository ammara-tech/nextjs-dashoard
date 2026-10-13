export type ChartTip = {
  title: string;
  /** Rows of label and value shown in the card. */
  rows: { label: string; value: string; color?: string }[];
  /** Optional small line under the rows. */
  footnote?: string;
};

/** Builds the value of a `data-tip` attribute for an element inside a ChartHoverArea. */
export const tip = (value: ChartTip) => JSON.stringify(value);
