# HelpLab Frontend

## Project Description

HelpLab is a civic tech platform for verifiable sustainability and social impact. This React-based frontend enables citizens, judges, sponsors, and public administration to track, verify, and measure local environmental and social actions.

**Core Features:**
- Challenge-based volunteering with verification system
- Real-time live dashboards for events
- ESG-compliant impact reporting (CSRD/ESRS)
- Learning paths with progress tracking
- Sponsor rating and evaluation
- Bitcoin Lightning Network micropayments integration

**Tech Stack:**
- React 18.3 + React Router 6.26
- Vite 5.0 (build tool)
- Tailwind CSS 4.0 + Custom CSS modules
- Axios for API calls
- i18next for internationalization

---

## Project Structure

```
src/
├── api/              # API client and endpoints
├── components/       # Reusable React components
│   ├── common/       # Shared components (Header, Footer)
│   ├── events/       # Event-specific components
│   ├── judge/        # Judge dashboard components
│   ├── sponsors/     # Sponsor components
│   └── UI/           # Base UI elements
├── context/          # React Context (Auth)
├── pages/            # Page components
│   ├── admin/        # Admin pages
│   ├── challenges/   # Challenge pages and forms
│   ├── events/       # Event pages
│   ├── judge/        # Judge-specific pages
│   ├── me/           # User personal area
│   └── sponsors/     # Sponsor pages
├── styles/           # CSS files
│   ├── styles.css           # Global styles
│   ├── dynamic-pages.css    # Operational pages utilities
│   ├── learning-paths.css   # Learning paths catalog
│   └── [feature].css        # Feature-specific styles
├── utils/            # Helper functions
├── routes.js         # Route definitions
└── App.jsx           # Main app component
```

---

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/StrategieSociali/HelpLab.git
cd HelpLab
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
VITE_API_URL= ask for detail
```

4. Start development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

---

## Versioning & Commit Standards

HelpLab Frontend follows **Semantic Versioning** with these conventions:

### Version Format: X.Y.Z

**X (Major)** - New feature classes or breaking changes  
Example: `1.0.0 → 2.0.0` (Events feature class added)

**Y (Minor)** - Single new features within current major version  
Example: `1.1.0 → 1.2.0` (Learning Paths feature added)

**Z (Patch)** - Bug fixes, CSS cleanup, performance improvements  
Example: `1.2.0 → 1.2.1` (Design system consolidation)

### Critical Updates

Security or critical bug fixes are tagged as:
```
X.Y.Z - CRITICAL UPDATE
```

### Commit Message Format

```
Release vX.Y.Z - Short Title

## Summary
Brief overview (2-3 sentences)

## Changes
- Category 1: key changes
- Category 2: key changes

## Impact
- What improved
- What was fixed

## Breaking Changes
List any breaking changes, or "None"
```

### Examples

**Patch Release:**
```
Release v1.2.1 - CSS Cleanup & Design System Consolidation
```

**Minor Release:**
```
Release v1.2.0 - Learning Paths Feature
```

**Critical Update:**
```
Release v1.1.8 - CRITICAL UPDATE - XSS Vulnerability Patch
```

---

## Deployment


### Production (api.helplab.space)
Manual deployment from `main` branch after validation.

**Deployment Steps:**
1. Test locally with `npm run build && npm run preview`
2. Create pull request to `main`
3. After merge, tag release: `git tag vX.Y.Z`
4. Push tag: `git push origin vX.Y.Z`
5. Build production bundle
6. Upload to production server

---

## Environment Variables

```bash
VITE_API_URL          # Backend API base URL
```

---

## Contributing

This is an open-source project managed by a non-profit organization. Contributions are welcome!

**How to Contribute:**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes following versioning standards
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

**Code Style:**
- Use semantic HTML and accessible components (WCAG 2.1 AA)
- Follow existing CSS architecture (global → dynamic-pages → feature-specific)
- Comment non-obvious UX choices
- Keep components small and reusable

---

## License

This project is open source and available under the MIT License.

---

## Links

- **Website**: [https://helplab.space](https://helplab.space)
- **API Documentation**: [Backend Handoff v0.9](./helplab_fe_handoff_v0_9.md)
- **Telegram Community**: [Join us](https://t.me/+h_Rh9IpYpgZjZjc0)
- **GitHub**: [StrategieSociali/HelpLab](https://github.com/StrategieSociali/HelpLab)

---

**Empowering people, transforming communities** 🌱
