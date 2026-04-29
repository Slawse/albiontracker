import { useState } from 'react'
import '../styles/rankings.css'

export default function Rankings({ contents, weaponTiers }) {
  const [contentMode, setContentMode] = useState('Mists')
  const [selectedWeapon, setSelectedWeapon] = useState(weaponTiers.Mists.S[0])

  return (
    <main className="tierPage">
      <div className="tierTop">
        <div>
          <h1>Tier List</h1>
          <p>Classement des armes par contenu avec build recommandé.</p>
        </div>

        <div className="contentSwitch">
          {contents.map((c) => (
            <button
              key={c}
              onClick={() => {
                setContentMode(c)
                setSelectedWeapon(weaponTiers[c].S[0])
              }}
              className={contentMode === c ? 'activeContent' : ''}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <section className="tierLayout">
        <div className="tierListPanel">
          {['S', 'A', 'B', 'C'].map((tier) => (
            <div className="tierBlock" key={tier}>
              <div className={`tierLabel tier${tier}`}>{tier}</div>

              <div className="tierWeapons">
                {weaponTiers[contentMode][tier].length === 0 && (
                  <span className="emptyTier">Aucune arme</span>
                )}

                {weaponTiers[contentMode][tier].map((w) => (
                  <button
                    key={w.name}
                    onClick={() => setSelectedWeapon(w)}
                    className={selectedWeapon.name === w.name ? 'weaponChip activeWeapon' : 'weaponChip'}
                  >
                    <strong>{w.name}</strong>
                    <span>{w.winrate}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside className="buildPanel">
          <div className="buildBadge">BUILD RECOMMANDÉ</div>

          <h2>{selectedWeapon.name}</h2>
          <p>{selectedWeapon.type} · {selectedWeapon.winrate} winrate</p>

          <div className="buildGrid">
            {Object.entries(selectedWeapon.build).map(([slot, item]) => (
              <div className="buildItem" key={slot}>
                <small>{slot}</small>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  )
}