import '../styles/tracker.css'

export default function PlayerProfile({ player }) {
  if (!player) {
    return (
      <main className="page emptyPage">
        <h1>Joueur introuvable</h1>
        <p>Retourne à l’accueil et cherche slaw, xernon ou chukak.</p>
      </main>
    )
  }

  const kd = (player.kills / Math.max(player.deaths, 1)).toFixed(2)
  const winrate = Math.round((player.kills / Math.max(player.kills + player.deaths, 1)) * 100)

  return (
    <main className="trackerPage">
      <section className="trackerGrid">
        <aside className="trackerSidebar">
          <div className="profileCard">
            <div className="profileAvatar">{player.name.slice(0, 2).toUpperCase()}</div>
            <h1>{player.name}</h1>
            <p>{player.guild}</p>
            <span>{player.tag}</span>
          </div>

          <div className="rankCard">
            <small>Rang PvP actuel</small>
            <strong>Gold 3</strong>
            <p>Top 12% des joueurs suivis</p>
          </div>

          <div className="sideStats">
            <div><small>PvP</small><strong>{player.pvp}</strong></div>
            <div><small>PvE</small><strong>{player.pve}</strong></div>
            <div><small>Récolte</small><strong>{player.gathering}</strong></div>
            <div><small>Fabrication</small><strong>{player.crafting}</strong></div>
            <div><small>Infamie</small><strong>{player.infamy}</strong></div>
            <div><small>Hellgate</small><strong>{player.hellgate}</strong></div>
          </div>
        </aside>

        <section className="trackerMain">
          <div className="overviewBar">
            <div className="circleStat">
              <strong>{winrate}%</strong>
              <span>Winrate</span>
            </div>

            <div className="overviewNumbers">
              <div><small>Kills</small><strong className="green">{player.kills}</strong></div>
              <div><small>Morts</small><strong className="red">{player.deaths}</strong></div>
              <div><small>KD</small><strong>{kd}</strong></div>
            </div>
          </div>

          <div className="trackerSectionTitle">
            <h2>Parties récentes</h2>
            <p>Résultat, équipement, fame et détails du fight.</p>
          </div>

          <div className="matchList">
            {player.fights.map((fight) => (
              <details className={`matchRow ${fight.type}`} key={fight.id}>
                <summary>
                  <div className="matchResult">
                    {fight.type === 'kill' ? 'Victoire' : 'Défaite'}
                    <span>{fight.time}</span>
                  </div>

                  <div className="matchWeapon">
                    <strong>{fight.weapon}</strong>
                    <span>{fight.zone}</span>
                  </div>

                  <div className="matchScore">
                    <strong className={fight.type === 'kill' ? 'green' : 'red'}>
                      {fight.type === 'kill' ? '+' : '-'}{fight.fame}
                    </strong>
                    <span>Fame</span>
                  </div>

                  <div className="matchOpponent">
                    <span>{fight.type === 'kill' ? 'Victime' : 'Tueur'}</span>
                    <strong>{fight.opponent}</strong>
                  </div>

                  <div className="matchArrow">⌄</div>
                </summary>

                <div className="matchDetails">
                  <div className="inventoryBox">
                    <h3>Stuff du tueur</h3>
                    <div className="itemGrid">
                      {fight.killerInventory.map((item) => (
                        <div className="itemSlot" key={item}>{item}</div>
                      ))}
                    </div>
                  </div>

                  <div className="inventoryBox">
                    <h3>Stuff de la victime</h3>
                    <div className="itemGrid">
                      {fight.victimInventory.map((item) => (
                        <div className="itemSlot" key={item}>{item}</div>
                      ))}
                    </div>
                  </div>

                  <div className="assistBox">
                    <h3>Aides</h3>
                    {fight.assists.length > 0 ? (
                      fight.assists.map((a) => <span key={a}>{a}</span>)
                    ) : (
                      <p>Aucune aide</p>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}