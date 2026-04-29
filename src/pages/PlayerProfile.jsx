import { useState } from 'react'
import '../styles/tracker.css'
import { getItemImage, cleanItemName } from '../utils/items'

export default function PlayerProfile({ player }) {
  const [tab, setTab] = useState('overview')

  if (!player) return null

  const kd = (player.kills / Math.max(player.deaths, 1)).toFixed(2)
  const winrate = Math.round((player.kills / Math.max(player.kills + player.deaths, 1)) * 100)

  const weaponStats = [
    { weapon: 'Bloodletter', mode: 'Mists', kd: '8.9 / 4.1 / 6.6', kills: 69, deaths: 51, winrate: '63%', tier: 'S' },
    { weapon: 'Dagger Pair', mode: 'Corrupted', kd: '6.7 / 6.3 / 9.3', kills: 70, deaths: 67, winrate: '51%', tier: 'S' },
    { weapon: 'Carving Sword', mode: 'Mists', kd: '10 / 7.0 / 5.7', kills: 32, deaths: 15, winrate: '68%', tier: 'A' },
    { weapon: 'Cursed Staff', mode: 'Corrupted', kd: '3.7 / 4.7 / 3.3', kills: 18, deaths: 19, winrate: '48%', tier: 'A' },
    { weapon: 'Great Holy', mode: 'Hellgate', kd: '4.0 / 5.0 / 3.5', kills: 22, deaths: 12, winrate: '65%', tier: 'B' },
  ]

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

          <div className="weaponPerformance">
            <div className="weaponPerfTop">
              <strong>Performance par arme</strong>
              <span>Mode · kills · morts · WR</span>
            </div>

            <div className="weaponPerfHead">
              <span>Arme</span>
              <span>K/D/A</span>
              <span>K</span>
              <span>D</span>
              <span>WR</span>
            </div>

            {weaponStats.map((w) => (
              <div className="weaponPerfRow" key={w.weapon}>
                <div className="weaponPerfName">
                  <div className={`weaponMini perfTier${w.tier}`}>{w.tier}</div>

                  <div>
                    <strong>{w.weapon}</strong>
                    <small>{w.mode}</small>
                  </div>
                </div>

                <span>{w.kd}</span>
                <b className="green">{w.kills}</b>
                <b className="red">{w.deaths}</b>
                <b className="gold">{w.winrate}</b>
              </div>
            ))}
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

          <div className="profileTabs">
            <button
              onClick={() => setTab('overview')}
              className={tab === 'overview' ? 'activeTab' : ''}
            >
              Aperçu
            </button>

            <button
              onClick={() => setTab('stats')}
              className={tab === 'stats' ? 'activeTab' : ''}
            >
              Stats
            </button>
          </div>

          {tab === 'overview' && (
            <>
              <div className="trackerSectionTitle">
                <h2>Parties récentes</h2>
                <p>Résultat, équipement, fame et détails du fight.</p>
              </div>

              <div className="matchList">
                {player.fights?.map((fight) => (
                  <details className={`matchRow ${fight.type}`} key={fight.id}>
                    <summary>
                      <div className="matchResult">
                        {fight.type === 'kill' ? 'Victoire' : 'Défaite'}
                        <span>{fight.time}</span>
                      </div>

                      <div className="matchWeapon weaponWithIcon">
                        {fight.weapon && fight.weapon !== 'Inconnu' && (
                          <img
                            src={getItemImage(fight.weapon)}
                            alt={cleanItemName(fight.weapon)}
                          />
                        )}

                        <div>
                          <strong>{cleanItemName(fight.weapon)}</strong>
                          <span>{fight.zone}</span>
                        </div>
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
                          {fight.killerInventory?.map((item) => (
                            <div className="itemSlot itemSlotImage" key={item}>
                              <img
                                src={getItemImage(item)}
                                alt={cleanItemName(item)}
                              />
                              <span>{cleanItemName(item)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="inventoryBox">
                        <h3>Stuff de la victime</h3>

                        <div className="itemGrid">
                          {fight.victimInventory?.map((item) => (
                            <div className="itemSlot itemSlotImage" key={item}>
                              <img
                                src={getItemImage(item)}
                                alt={cleanItemName(item)}
                              />
                              <span>{cleanItemName(item)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="assistBox">
                        <h3>Aides</h3>

                        {fight.assists?.length > 0 ? (
                          fight.assists.map((a) => <span key={a}>{a}</span>)
                        ) : (
                          <p>Aucune aide</p>
                        )}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </>
          )}

          {tab === 'stats' && (
            <section className="statOverview">
              <div className="radarCard">
                <div className="miniTitle">Performance overview</div>

                <div className="radarWrap">
                  <svg className="radar" viewBox="0 0 300 300">
                    <polygon className="radarGrid" points="150,25 270,95 240,235 60,235 30,95" />
                    <polygon className="radarGrid small" points="150,70 225,112 205,205 95,205 75,112" />
                    <polygon className="radarShape" points="150,45 245,105 215,215 75,220 60,110" />

                    <text x="150" y="18">PvP</text>
                    <text x="285" y="98">PvE</text>
                    <text x="245" y="260">Récolte</text>
                    <text x="55" y="260">Craft</text>
                    <text x="15" y="98">KD</text>
                  </svg>
                </div>
              </div>

              <div className="perfCards">
                <div><strong className="green">{player.kills}</strong><span>Kills total</span></div>
                <div><strong className="red">{player.deaths}</strong><span>Morts total</span></div>
                <div><strong>{kd}</strong><span>KD ratio</span></div>
                <div><strong>{winrate}%</strong><span>Winrate</span></div>
                <div><strong>{player.infamy}</strong><span>Infamie</span></div>
                <div><strong>{player.hellgate}</strong><span>Hellgate</span></div>
              </div>
            </section>
          )}
        </section>
      </section>
    </main>
  )
}