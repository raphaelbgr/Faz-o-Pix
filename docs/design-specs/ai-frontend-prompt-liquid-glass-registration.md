# 🎨 AI Frontend Prompt: Liquid Glass Registration System

## Overview
This is a masterful, comprehensive prompt for generating a beautiful liquid glass registration interface for Faz-o-Pix with complete dark/light mode support and local storage persistence.

---

# CONTEXT & PROJECT OVERVIEW
You are building a beautiful registration form for "Faz-o-Pix", a Brazilian bill-splitting app using Next.js 14, TypeScript, Tailwind CSS, React Hook Form, and Zod validation. The design should feature a modern "liquid glass" aesthetic with smooth gradients, subtle glassmorphism effects, and MANDATORY comprehensive dark/light mode support with local storage persistence.

Tech Stack:
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS (with Inter font)
- React Hook Form + Zod validation
- Custom PIX green color palette (pix-50 to pix-900)
- CSS custom properties for theming
- Local Storage for theme persistence

# HIGH-LEVEL GOAL
Create a stunning, mobile-first registration form with liquid glass aesthetics that allows users to register with multiple Brazilian PIX keys. CRITICAL: Every single element, component, and interaction MUST automatically support both dark and light modes with seamless transitions and persistent user preferences.

# DETAILED STEP-BY-Step INSTRUCTIONS

## 1. MANDATORY Theme System Implementation
- **REQUIREMENT**: Every component, button, input, text, and visual element MUST have both dark and light mode variants
- **REQUIREMENT**: Implement theme persistence using localStorage with key 'faz-o-pix-theme'
- **REQUIREMENT**: Add theme toggle component (sun/moon icons) in top-right corner
- **REQUIREMENT**: Default to system preference (prefers-color-scheme) on first visit
- **REQUIREMENT**: Apply theme class to document.documentElement ('dark' or 'light')

### Theme Hook Implementation:
```typescript
const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  useEffect(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem('faz-o-pix-theme')
    if (stored && ['light', 'dark'].includes(stored)) {
      setTheme(stored as 'light' | 'dark')
    } else {
      setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    }
  }, [])
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('faz-o-pix-theme', newTheme)
    document.documentElement.className = newTheme
  }
  
  return { theme, toggleTheme }
}
```

## 2. Complete CSS Custom Properties System
**REQUIREMENT**: Extend globals.css with COMPREHENSIVE theme variables for ALL design elements:

```css
@layer base {
  :root {
    /* Backgrounds */
    --background: 0 0% 100%;
    --background-secondary: 0 0% 98%;
    --background-glass: 0 0% 100% / 0.1;
    --background-card: 0 0% 100%;
    --background-input: 0 0% 100%;
    
    /* Text Colors */
    --foreground: 222.2 84% 4.9%;
    --foreground-muted: 215.4 16.3% 46.9%;
    --foreground-secondary: 215.3 19.3% 34.9%;
    
    /* Interactive Elements */
    --border: 214.3 31.8% 91.4%;
    --border-input: 214.3 31.8% 91.4%;
    --border-focus: 142.1 76.2% 36.3%;
    
    /* Glass Effects */
    --glass-background: 255 255 255 / 0.05;
    --glass-border: 255 255 255 / 0.1;
    --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    
    /* PIX Brand Colors - Light Mode */
    --pix-primary: 142.1 76.2% 36.3%; /* #16a34a */
    --pix-hover: 142.1 70.6% 45.3%;   /* #22c55e */
    --pix-glow: 142.1 76.2% 36.3% / 0.3;
  }

  .dark {
    /* Backgrounds */
    --background: 222.2 84% 4.9%;
    --background-secondary: 217.2 32.6% 8.5%;
    --background-glass: 0 0% 0% / 0.2;
    --background-card: 222.2 84% 8.9%;
    --background-input: 217.2 32.6% 12.5%;
    
    /* Text Colors */
    --foreground: 210 40% 98%;
    --foreground-muted: 215 20.2% 65.1%;
    --foreground-secondary: 215 25.0% 71.0%;
    
    /* Interactive Elements */
    --border: 217.2 32.6% 17.5%;
    --border-input: 217.2 32.6% 20.5%;
    --border-focus: 142.1 76.2% 46.3%;
    
    /* Glass Effects */
    --glass-background: 0 0 0 / 0.2;
    --glass-border: 255 255 255 / 0.05;
    --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
    
    /* PIX Brand Colors - Dark Mode */
    --pix-primary: 142.1 76.2% 46.3%; /* Brighter green for dark */
    --pix-hover: 142.1 76.2% 56.3%;
    --pix-glow: 142.1 76.2% 46.3% / 0.5;
  }
}

/* Glass Morphism Utilities */
@layer utilities {
  .glass-card {
    background: hsl(var(--glass-background));
    backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid hsl(var(--glass-border));
    box-shadow: var(--glass-shadow);
  }
  
  .input-glass {
    background: hsl(var(--background-input));
    border: 1px solid hsl(var(--border-input));
    transition: all 0.3s ease;
  }
  
  .input-glass:focus {
    border-color: hsl(var(--border-focus));
    box-shadow: 0 0 0 3px hsl(var(--pix-glow));
  }
}
```

## 3. MANDATORY Element-by-Element Theme Support
**REQUIREMENT**: Every single UI element MUST use CSS custom properties. NO hardcoded colors allowed:

### Form Container:
- Background: `glass-card` utility class
- Border: `border-glass-border`
- Shadow: CSS custom property shadow

### Input Fields:
- Background: `bg-background-input`
- Border: `border-border-input`
- Text: `text-foreground`
- Focus states: `focus:border-border-focus focus:shadow-[0_0_0_3px_hsl(var(--pix-glow))]`

### Buttons:
- Primary: `bg-[hsl(var(--pix-primary))] hover:bg-[hsl(var(--pix-hover))]`
- Secondary: `bg-background-secondary border-border`
- Text: `text-white dark:text-background` for primary buttons

### Typography:
- Headers: `text-foreground`
- Body text: `text-foreground-secondary`
- Muted text: `text-foreground-muted`
- Labels: `text-foreground`

### Icons and Decorative Elements:
- ALL icons MUST have theme-aware colors
- PIX logo/branding: Use `text-[hsl(var(--pix-primary))]`

## 4. Theme Toggle Component Requirements
**REQUIREMENT**: Create a floating theme toggle button:
```typescript
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 glass-card p-3 rounded-full 
                 text-[hsl(var(--foreground))] hover:text-[hsl(var(--pix-primary))]
                 transition-all duration-300 hover:scale-110"
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  )
}
```

## 5. Animation Requirements with Theme Support
**REQUIREMENT**: ALL animations MUST work in both themes:
```javascript
// Enhanced tailwind.config.js
animation: {
  'float': 'float 6s ease-in-out infinite',
  'glow-light': 'glow-light 2s ease-in-out infinite alternate',
  'glow-dark': 'glow-dark 2s ease-in-out infinite alternate',
  'theme-transition': 'theme-transition 0.3s ease-in-out',
},
keyframes: {
  'glow-light': {
    'from': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' },
    'to': { boxShadow: '0 0 30px rgba(34, 197, 94, 0.6)' },
  },
  'glow-dark': {
    'from': { boxShadow: '0 0 20px rgba(52, 211, 153, 0.4)' },
    'to': { boxShadow: '0 0 30px rgba(52, 211, 153, 0.8)' },
  },
  'theme-transition': {
    'from': { opacity: '0.8' },
    'to': { opacity: '1' },
  }
}
```

## 6. Visual Design System
- Create a liquid glass design with subtle glassmorphism effects using backdrop-blur and semi-transparent backgrounds
- Implement smooth gradient overlays with PIX green accents (#22c55e to #16a34a)
- Add floating animation effects and micro-interactions
- Design for mobile-first (320px+) with responsive breakpoints
- Ensure 4.5:1 contrast ratios for accessibility

## 7. Multi-PIX Key Form Structure
- Create dynamic form fields using useFieldArray from React Hook Form
- Start with one PIX key field (email default)
- Add "+ Adicionar chave PIX" button with smooth slide-in animations
- Remove buttons (×) for additional keys with fade-out effects
- Support all PIX key types: CPF, CNPJ, email, phone, EVP (Chave Aleatória)

## 8. Form Validation & UX
- Real-time validation with Zod schema
- Smooth error state animations with shake/pulse effects
- Success states with subtle glow effects
- Loading states with elegant shimmer animations
- Brazilian Portuguese error messages
- Format-as-you-type for CPF/phone numbers

## 9. Local Storage Persistence Requirements
**REQUIREMENT**: Theme preference MUST persist across:
- Page reloads
- Browser sessions
- Tab switching
- Component remounts

**REQUIREMENT**: Handle edge cases:
- Invalid localStorage values
- First-time visitors
- System theme changes
- Local storage not available

## 10. Testing Requirements
**REQUIREMENT**: The component MUST be tested in:
- Light mode default state
- Dark mode switch
- System preference detection
- Local storage persistence
- Theme toggle animations
- All form states in both themes

# CODE STRUCTURE & CONSTRAINTS

## Required Form Schema:
```typescript
const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
  identifiers: z.array(z.object({
    type: z.enum(['cpf', 'email', 'phone', 'cnpj', 'evp']),
    value: z.string().min(1, 'Identificador é obrigatório'),
  })).min(1, 'Pelo menos uma chave PIX é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})
```

## PIX Key Types:
- CPF: Format with mask 000.000.000-00
- CNPJ: Format with mask 00.000.000/0001-00  
- Email: Standard email validation
- Phone: Brazilian format (11) 99999-9999
- EVP: UUID v4 format display

## API Integration:
```typescript
await api.post('/auth/signup', {
  name: data.fullName,
  password: data.password,
  identifiers: cleanedIdentifiers,
  lgpdConsent: {
    accepted: true,
    timestamp: new Date().toISOString(),
    ipAddress: '',
  }
})
```

# ABSOLUTE REQUIREMENTS CHECKLIST
Before considering the code complete, verify:
- [ ] Every text element uses CSS custom properties
- [ ] Every background uses theme-aware variables
- [ ] Every border uses theme-aware colors
- [ ] Every button has both light/dark variants
- [ ] Every input field supports both themes
- [ ] Theme toggle is present and functional
- [ ] LocalStorage persistence works
- [ ] System preference detection works
- [ ] Smooth transitions between themes
- [ ] All animations work in both themes
- [ ] No hardcoded colors anywhere in the code

# STRICT SCOPE BOUNDARIES
- MODIFY: `/frontend/src/app/(auth)/signup/page.tsx` (add theme support)
- EXTEND: `/frontend/tailwind.config.js` (add theme-aware animations)
- ENHANCE: `/frontend/src/app/globals.css` (add comprehensive CSS custom properties)
- CREATE: Custom `useTheme` hook for theme management
- CREATE: `ThemeToggle` component
- DO NOT: Modify API endpoints, validation utils, or other unrelated components

# DELIVERABLE REQUIREMENTS
Generate complete, production-ready code that includes:
1. Beautiful liquid glass registration form component
2. Comprehensive dark/light mode support
3. Smooth animations and micro-interactions
4. Mobile-first responsive design
5. Accessibility compliance (WCAG 2.1 AA)
6. Brazilian Portuguese copy and formatting
7. Clean, maintainable TypeScript code

The final result should be visually stunning, performant, and provide an exceptional user experience that delights users while maintaining functionality.

---

## Usage Instructions

1. Copy the entire prompt above
2. Paste it into your preferred AI frontend generation tool (v0, Lovable, etc.)
3. Review and iterate on the generated code
4. Test thoroughly in both light and dark modes
5. Verify all requirements in the checklist are met

## Important Note
All AI-generated code will require careful human review, testing, and refinement to be considered production-ready. This prompt provides a strong foundation, but you should iterate on the results and fine-tune the design based on your specific needs and user testing feedback.