import './DepartmentHeader.css'

/**
 * Department Header Component
 * Displays department name consistently across all pages
 * Used on all pages except the home page
 */
function DepartmentHeader({ title, subtitle }) {
  return (
    <div className="department-header">
      <div className="department-header-content">
        <h1 className="department-header-title">
          Department of Information Science and Engineering, BIT
        </h1>
        {title && <h2 className="page-title">{title}</h2>}
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}

export default DepartmentHeader
