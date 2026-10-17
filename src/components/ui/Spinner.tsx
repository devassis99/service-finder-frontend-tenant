/** A small teal ring, for a button or a card that's waiting on the API. */
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <output
      aria-label="Loading"
      className="inline-block shrink-0 rounded-full border-2 border-tn-accent-bg border-t-tn-accent"
      style={{ width: size, height: size, animation: "tn-spin 0.8s linear infinite" }}
    />
  );
}

export default Spinner;
