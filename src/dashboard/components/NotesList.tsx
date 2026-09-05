export function NotesList({ notes }: { notes: string[] }) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
}
