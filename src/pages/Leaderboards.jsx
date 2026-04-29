import { useState } from 'react'
import '../styles/leaderboards.css'

export default function Leaderboards({ leaderboards }) {
  const [content, setContent] = useState('Mists')
  const players = leaderboards[content]

  return (
    <main className="leaderPage">
      <div className="leaderTop">
        <div>
          <h1>Classement</h1>
          <p>Top joueurs par contenu PvP.</p>
        </div>

        <div className="leaderSwitch">
          {Object.keys(leaderboards).map((c) => (
            <button
              key={c}
              onClick={() => setContent(c)}
              className={content === c ? 'activeLeader' : ''}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="leaderBoard">
        <div className="leaderHeader">
          <span>#</span>
          <span>Joueur</span>
          <span>Kills</span>
          <span>Morts</span>
          <span>Fame</span>
          <span>Winrate</span>
        </div>

        {players.map((p) => (
          <div className="leaderRow" key={p.name}>
            <div className="leaderRank">#{p.rank}</div>

            <div className="leaderPlayer">
              <strong>{p.name}</strong>
              <span>{p.guild}</span>
            </div>

            <div className="green">{p.kills}</div>
            <div className="red">{p.deaths}</div>
            <div className="gold">{p.fame}</div>
            <div>{p.winrate}</div>
          </div>
        ))}
      </div>
    </main>
  )
}