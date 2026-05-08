export default function MiniSparkline({ points = [], danger = false }) {
  const values = points.map((point) =>
    typeof point === 'number' ? point : Number(point.winrate || point.fights || 0)
  )
  const safeValues = values.length ? values : [0, 0]
  const max = Math.max(...safeValues)
  const min = Math.min(...safeValues)
  const width = 150
  const height = 42

  const path = safeValues
    .map((point, index) => {
      const x = (index / Math.max(safeValues.length - 1, 1)) * width
      const y = height - ((point - min) / Math.max(max - min, 1)) * height
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  const lastY =
    height -
    ((safeValues[safeValues.length - 1] - min) / Math.max(max - min, 1)) * height

  return (
    <svg className="metaSparkline" viewBox={`0 0 ${width} ${height}`}>
      <path className={danger ? 'metaSparkPath danger' : 'metaSparkPath'} d={path} />
      <circle
        className={danger ? 'metaSparkDot danger' : 'metaSparkDot'}
        cx={width}
        cy={lastY}
        r="4"
      />
    </svg>
  )
}
