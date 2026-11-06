import { useState } from "react";
import { CREDITS, PROJECT_LINE, type Credit } from "../credits";

function initials(name: string): string {
  const parts = name.split(" ");
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ credit }: { credit: Credit }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="credit__avatar credit__avatar--initials" aria-hidden="true">
        {initials(credit.name)}
      </span>
    );
  }
  return (
    <img
      className="credit__avatar"
      src={`https://github.com/${credit.github}.png?size=112`}
      alt={`Foto de ${credit.name}`}
      width={56}
      height={56}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export default function Credits() {
  return (
    <footer className="footer">
      <ul className="credits">
        {CREDITS.map((c) => (
          <li key={c.github}>
            <a
              className="credit"
              href={`https://github.com/${c.github}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Avatar credit={c} />
              <span className="credit__text">
                <strong className="credit__name">{c.name}</strong>
                <span className="credit__role">{c.role}</span>
                <span className="credit__user">@{c.github}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="footer__project">{PROJECT_LINE}</p>
    </footer>
  );
}
