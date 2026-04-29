export default function WeaponCard({ weapon }) {
  return (
    <div className="homeWeaponCard">

      <div className="homeTier">
        {weapon.tier}
      </div>

      <div>
        <strong>{weapon.name}</strong>
        <span>{weapon.type} · {weapon.content}</span>
      </div>

      <b>{weapon.winrate}</b>

    </div>
  )
}