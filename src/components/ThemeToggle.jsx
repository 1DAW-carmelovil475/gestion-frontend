import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button
      className="btn-theme-toggle"
      onClick={toggle}
      title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <i className={`fas ${dark ? 'fa-sun' : 'fa-moon'}`}></i>
    </button>
  )
}
