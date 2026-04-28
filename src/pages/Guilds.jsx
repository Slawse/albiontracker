export default function Guilds({ guilds }) {
  return (
    <main className="guildPage">
      <h1 className="guildTitle">Classement Guildes</h1>

      <div className="guildRanking">
        <div className="guildHeader">
          <span>#</span>
          <span>GUILDE</span>
          <span>KILLS</span>
          <span>MORTS</span>
          <span>FAME</span>
          <span></span>
        </div>

        {guilds.map((g) => (
          <details key={g.name} className="guildRow">
            <summary className="guildRowLine">
              <div className="rank">#{g.rank}</div>

              <div className="guildInfo">
                <strong>{g.name}</strong>
                <span>{g.region} · {g.members} membres</span>
              </div>

              <div className="guildStat green">{g.kills.toLocaleString()}</div>
              <div className="guildStat red">{g.deaths.toLocaleString()}</div>
              <div className="guildStat gold">{g.fame}</div>

              <div className="arrow">⌄</div>
            </summary>

            <div className="players">
              {g.players.map((p) => (
                <div className="player" key={p}>
                  <div className="avatar">{p.slice(0, 2)}</div>

                  <div>
                    <strong>{p}</strong>
                    <span>Membre</span>
                  </div>

                  <button>Voir</button>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </main>
  )
}