const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  prompt: "M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h5",
  chat: "M21 11.5a8.4 8.4 0 0 1-9 8.5 10 10 0 0 1-4-.8L3 21l1.7-5a9 9 0 1 1 16.3-4.5z M8 11h.1 M12 11h.1 M16 11h.1",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0z",
  plus: "M12 5v14 M5 12h14",
  copy: "M9 9h12v12H9z M15 9V3H3v12h6",
  trash: "M3 6h18 M8 6V3h8v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7",
  clock: "M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z",
  check: "M5 12l4 4L19 6",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  download: "M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4",
  back: "M19 12H5 M11 6l-6 6 6 6",
  external: "M14 3h7v7 M21 3L10 14 M10 3H3v18h18v-7",
  refresh: "M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 14 6 M18 18a8 8 0 0 1-14-6",
};
export default function Icon({ name, size = 19, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
