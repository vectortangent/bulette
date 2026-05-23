import { useState } from "react";

type TreeNodeProps = {
  label: string;
  value?: unknown;
  defaultOpen?: boolean;
};

function TreeNode({ label, value, defaultOpen = false }: TreeNodeProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (value === null || value === undefined) {
    return (
      <li className="tree-leaf">
        <span className="tree-key">{label}</span>: <span className="tree-null">null</span>
      </li>
    );
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <li className="tree-branch">
        <span className="tree-toggle" onClick={() => setOpen(!open)}>
          {open ? "▼" : "▶"} <span className="tree-key">{label}</span>
          {!open && <span className="tree-preview"> {`{${entries.length}}`}</span>}
        </span>
        {open && (
          <ul className="tree-children">
            {entries.map(([key, val]) => (
              <TreeNode key={key} label={key} value={val} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  if (Array.isArray(value)) {
    return (
      <li className="tree-branch">
        <span className="tree-toggle" onClick={() => setOpen(!open)}>
          {open ? "▼" : "▶"} <span className="tree-key">{label}</span>
          {!open && <span className="tree-preview"> [{value.length}]</span>}
        </span>
        {open && (
          <ul className="tree-children">
            {value.map((item, i) => {
              const itemLabel = (item as { name?: string })?.name
                ? `${i} (${(item as { name: string }).name})`
                : String(i);
              return <TreeNode key={i} label={itemLabel} value={item} />;
            })}
          </ul>
        )}
      </li>
    );
  }

  if (typeof value === "string" && value.startsWith("http")) {
    return (
      <li className="tree-leaf">
        <span className="tree-key">{label}</span>:{" "}
        <a className="tree-url" href={value} target="_blank" rel="noopener noreferrer" title={value}>
          {value.length > 50 ? value.slice(0, 50) + "…" : value}
        </a>
      </li>
    );
  }

  const display = typeof value === "string" ? `"${value}"` : String(value);
  const className = typeof value === "number" ? "tree-number"
    : typeof value === "boolean" ? "tree-boolean"
    : "tree-string";

  return (
    <li className="tree-leaf">
      <span className="tree-key">{label}</span>: <span className={className}>{display}</span>
    </li>
  );
}

type BoardStateTreeProps = {
  data: unknown;
};

export function BoardStateTree({ data }: BoardStateTreeProps) {
  if (!data) {
    return <div className="tree-empty">No board state loaded</div>;
  }

  return (
    <ul className="tree-root">
      <TreeNode label="boardState" value={data} defaultOpen={true} />
    </ul>
  );
}
