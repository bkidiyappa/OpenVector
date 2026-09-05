export type TableColumn<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => string;
};

type DataTableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  empty: string;
  onRowClick?: (row: T) => void;
  rowHint?: string;
};

export function DataTable<T extends object>({ columns, rows, empty, onRowClick, rowHint }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      {rowHint ? <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">{rowHint}</p> : null}
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-4 py-3 font-semibold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className={`border-t border-slate-100 ${onRowClick ? "cursor-pointer hover:bg-teal-50" : ""}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td key={String(column.key)} className="px-4 py-3 font-mono text-slate-800">
                  {column.render ? column.render(row) : String(row[column.key as keyof T] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
