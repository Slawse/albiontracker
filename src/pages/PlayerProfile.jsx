import { useState } from 'react'
import '../styles/tracker.css'
import { getItemImage, cleanItemName } from '../utils/items'

const FIGHTS_PER_PAGE = 10

function getWeaponStatsFromFights(fights = []) {
  const weapons = {}

  fights.forEach((fight) => {
    const weapon = fight.weapon || 'Inconnu'

    if (!weapons[weapon]) {
      weapons[weapon] = { weapon, kills: 0, deaths: 0 }
    }

    if (fight.type === 'kill') weapons[weapon].kills += 1
    if (fight.type === 'death') weapons[weapon].deaths += 1
  })

  return Object.values(weapons)
    .map((weapon) => {
      const total = weapon.kills + weapon.deaths

      return {
        ...weapon,
        total,
        kd: (weapon.kills / Math.max(weapon.deaths, 1)).toFixed(2),
        winrate: total ? `${Math.round((weapon.kills / total) * 100)}%` : '0%',
      }
    })
    .sort((a, b) => b.total - a.total)
}

function GearGrid({ title, items = [], emptyText = 'Aucun item', note = '' }) {
  return (
    <div className="inventoryBox gearBox">
      <div className="gearBoxTop">
        <h3>{title}</h3>
        {note && <span>{note}</span>}
      </div>

      <div className="gearGrid">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div
              className="gearSlot"
              key={`${item}-${index}`}
              title={cleanItemName(item)}
            >
              <img src={getItemImage(item)} alt={cleanItemName(item)} />
            </div>
          ))
        ) : (
          <p className="emptyGear">{emptyText}</p>
        )}
      </div>
    </div>
  )
}

function FightDetails({ fight }) {
  const [viewMode, setViewMode] = useState('compare')

  const victimInventory = fight.victimBag || []

  return (
    <div className="fightDetailsWrap">
      <div className="detailsToolbar">
        <div className="detailsViewTabs">
          <button
            type="button"
            onClick={() => setViewMode('compare')}
            className={viewMode === 'compare' ? 'activeDetailsTab' : ''}
          >
            Comparer
          </button>

          <button
            type="button"
            onClick={() => setViewMode('inventory')}
            className={viewMode === 'inventory' ? 'activeDetailsTab' : ''}
          >
            Inventaire
          </button>
        </div>
      </div>

      {viewMode === 'compare' && (
        <div className="matchDetails gearDetails">
          <GearGrid
            title="Stuff du tueur"
            items={fight.killerInventory || []}
            emptyText="Aucun stuff"
          />

          <GearGrid
            title="Stuff de la victime"
            items={fight.victimInventory || []}
            emptyText="Aucun stuff"
          />

          <div className="assistBox">
            <h3>Aides</h3>

            {fight.assists?.length > 0 ? (
              fight.assists.map((assist) => (
                <span key={`${fight.id}-${assist}`}>{assist}</span>
              ))
            ) : (
              <p>Aucune aide</p>
            )}
          </div>
        </div>
      )}

      {viewMode === 'inventory' && (
        <div className="inventoryMode">
          <GearGrid
            title="Inventaire de la victime"
            items={victimInventory}
            emptyText="Inventaire indisponible"
            note={victimInventory.length === 0 ? 'Indisponible' : ''}
          />

          <div className="assistBox inventoryAssistBox">
            <h3>Aides</h3>

            {fight.assists?.length > 0 ? (
              fight.assists.map((assist) => (
                <span key={`${fight.id}-inventory-${assist}`}>{assist}</span>
              ))
            ) : (
              <p>Aucune aide</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlayerProfile({ player }) {
  const [tab, setTab] = useState('overview')
  const [currentPage, setCurrentPage] = useState(1)

  if (!player) return null

  const fights = player.fights || []
  const weaponStats = getWeaponStatsFromFights(fights)

  const kd = (player.kills / Math.max(player.deaths, 1)).toFixed(2)
  const winrate = Math.round(
    (player.kills / Math.max(player.kills + player.deaths, 1)) * 100
  )

  const totalPages = Math.ceil(fights.length / FIGHTS_PER_PAGE)
  const startIndex = (currentPage - 1) * FIGHTS_PER_PAGE
  const visibleFightList = fights.slice(startIndex, startIndex + FIGHTS_PER_PAGE)

  function goToPage(page) {
    if (page < 1 || page > totalPages) return

    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="trackerPage">
      <section className="trackerGrid">
        <aside className="trackerSidebar">
          <div className="profileCard noAvatar">
            <h1>{player.name}</h1>
            <p>{player.guild}</p>
            <span className="guildTag">{player.tag}</span>
          </div>

          <div className="weaponPerformance">
            <div className="weaponPerfTop">
              <strong>Performance par arme</strong>
              <span>Basé sur les fights chargés</span>
            </div>

            <div className="weaponPerfHead">
              <span>Arme</span>
              <span>KD</span>
              <span>K</span>
              <span>D</span>
              <span>WR</span>
            </div>

            {weaponStats.length > 0 ? (
              weaponStats.map((weapon) => (
                <div className="weaponPerfRow" key={weapon.weapon}>
                  <div className="weaponPerfName">
                    {weapon.weapon !== 'Inconnu' ? (
                      <img
                        className="weaponIcon"
                        src={getItemImage(weapon.weapon)}
                        alt={cleanItemName(weapon.weapon)}
                      />
                    ) : (
                      <div className="weaponMini">?</div>
                    )}

                    <div>
                      <strong>{cleanItemName(weapon.weapon)}</strong>
                      <small>{weapon.total} fights</small>
                    </div>
                  </div>

                  <span>{weapon.kd}</span>
                  <b className="green">{weapon.kills}</b>
                  <b className="red">{weapon.deaths}</b>
                  <b className="gold">{weapon.winrate}</b>
                </div>
              ))
            ) : (
              <p className="emptyWeaponStats">Aucune arme trouvée</p>
            )}
          </div>

          <div className="sideStats">
            <div>
              <small>PvP</small>
              <strong>{player.pvp}</strong>
            </div>

            <div>
              <small>PvE</small>
              <strong>{player.pve}</strong>
            </div>

            <div>
              <small>Récolte</small>
              <strong>{player.gathering}</strong>
            </div>

            <div>
              <small>Fabrication</small>
              <strong>{player.crafting}</strong>
            </div>

            <div>
              <small>Infamie</small>
              <strong>{player.infamy}</strong>
            </div>

            <div>
              <small>Hellgate</small>
              <strong>{player.hellgate}</strong>
            </div>
          </div>
        </aside>

        <section className="trackerMain">
          <div className="overviewBar">
            <div className="circleStat">
              <strong>{winrate}%</strong>
              <span>Winrate</span>
            </div>

            <div className="overviewNumbers">
              <div>
                <small>Kills</small>
                <strong className="green">{player.kills}</strong>
              </div>

              <div>
                <small>Morts</small>
                <strong className="red">{player.deaths}</strong>
              </div>

              <div>
                <small>KD</small>
                <strong>{kd}</strong>
              </div>
            </div>
          </div>

          <div className="profileTabs">
            <button
              type="button"
              onClick={() => setTab('overview')}
              className={tab === 'overview' ? 'activeTab' : ''}
            >
              Aperçu
            </button>

            <button
              type="button"
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
                <p>
                  Résultat, équipement, fame et détails du fight.
                  {totalPages > 1 && ` Page ${currentPage}/${totalPages}`}
                </p>
              </div>

              <div className="matchList">
                {visibleFightList.map((fight) => (
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

                      <div className="matchAssists">
                        <span className="assistIcon">👥</span>
                        <strong>+{fight.assists?.length || 0}</strong>
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

                    <FightDetails fight={fight} />
                  </details>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ←
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => {
                    const page = index + 1

                    return (
                      <button
                        type="button"
                        key={page}
                        onClick={() => goToPage(page)}
                        className={currentPage === page ? 'activePage' : ''}
                      >
                        {page}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'stats' && (
            <section className="statOverview">
              <div className="perfCards">
                <div>
                  <strong className="green">{player.kills}</strong>
                  <span>Kills</span>
                </div>

                <div>
                  <strong className="red">{player.deaths}</strong>
                  <span>Morts</span>
                </div>

                <div>
                  <strong>{kd}</strong>
                  <span>KD</span>
                </div>

                <div>
                  <strong>{winrate}%</strong>
                  <span>WR</span>
                </div>
              </div>
            </section>
          )}
        </section>
      </section>
    </main>
  )
}