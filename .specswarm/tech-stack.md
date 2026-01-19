# Tech Stack

**Version**: 1.0.0
**Last Updated**: 2026-01-19
**Project**: SmartZap SaaS

## Core Technologies

### Language & Runtime
- **TypeScript** 5.x - Primary language
- **Node.js** 22+ - Runtime environment

### Framework
- **Next.js** 16.x (App Router) - Full-stack React framework
- **React** 19.x - UI library

### Database & Backend Services
- **Supabase** (PostgreSQL) - Database, Auth, Realtime
- **Upstash QStash** - Message queue for campaigns
- **Upstash Workflow** 0.3.x - Durable workflow execution

## Standard Libraries

### AI & LLM
- **Vercel AI SDK** 6.x (`ai`) - Core AI abstraction
- **@ai-sdk/google** - Gemini models
- **@ai-sdk/anthropic** - Claude models (secondary)
- **@ai-sdk/openai** - OpenAI models (secondary)

### State Management
- **TanStack Query** 5.x - Server state management
- **Zustand** 5.x - Client state (global)
- **Jotai** 2.x - Client state (atomic)

### UI Components
- **Radix UI** - Headless accessible components
- **shadcn/ui** - Component library (local copy)
- **Tailwind CSS** 4.x - Styling
- **Lucide React** - Icons

### Forms & Validation
- **React Hook Form** 7.x - Form management
- **Zod** 4.x - Schema validation

### Utilities
- **date-fns** + **date-fns-tz** - Date manipulation
- **libphonenumber-js** - Phone number parsing/validation
- **nanoid** - ID generation
- **clsx** + **tailwind-merge** - Class utilities

### Visualization
- **XYFlow** (@xyflow/react) - Flow/workflow editor
- **Recharts** - Charts and graphs

### Code Editor
- **Monaco Editor** - Code editing
- **CodeMirror** - Lightweight code display

## Testing

- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **Testing Library** - Component testing

## Prohibited Technologies

<!-- ❌ Technologies that MUST NOT be used in this project -->

- ❌ **Axios** - Use: native `fetch` API
- ❌ **Moment.js** - Use: `date-fns`
- ❌ **Redux** - Use: TanStack Query + Zustand/Jotai
- ❌ **Styled Components** - Use: Tailwind CSS
- ❌ **Emotion** - Use: Tailwind CSS
- ❌ **Class Components** - Use: Functional components with hooks
- ❌ **Prisma** - Use: Direct Supabase client
- ❌ **Drizzle ORM** - Use: Direct Supabase client
- ❌ **Express/Fastify** - Use: Next.js API routes
- ❌ **Other icon libraries** - Use: Lucide React exclusively

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-19 | Initial tech stack from Feature 001 |
