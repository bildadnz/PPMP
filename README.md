# Project Process Master Plan (PPMP)

## Overview

Project Process Master Plan (PPMP) is an advanced process intelligence platform designed for mapping, visualizing, analyzing, and validating process models. It uses data-driven insights and AI recommendations to generate comprehensive execution strategies, validate relational constraints between milestone steps, and accurately estimate resource budgets.

## Key Features

- **Design Editor**: Interactive canvas to drag, drop, connect, and configure process nodes (milestones) and task slots.
- **Data Insights (AI Integrations)**: Leverages Google's Gemini models to synthesize node-specific user data, notes, reference links, and upstream dependencies. It parses context to generate recommended execution strategies, required resources with cost estimates, and calculates an algorithmic "Comparison Alignment Weight" to gauge readiness. Geolocation support allows spatial queries using Gemini's Maps functions.
- **Simulation Validation Engine**: A deterministic relational engine that traverses the process graph. It validates that all upstream steps have succeeded and enforces constraints (e.g., Node alignment weight must be `> 1.0`) before permitting the process workflow to proceed.
- **Full Execution Reporting**: Aggregates all node data, cost estimates, validation statuses, and AI-driven strategies into a master blueprint. You can download the report as a PDF via printing, or export a self-contained HTML file.
- **Project File Management**: Save and load your entire project workspace (nodes, connections, drafts, insights) seamlessly using static JSON files to preserve and resume your work later.
- **Multi-Currency Support**: On-the-fly budget formatting allows dynamic switching of cost estimates between common currencies (USD, EUR, GBP, JPY, INR, CAD).

## Technology Stack

- **Frontend Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: `@google/genai` (Gemini 3.0 Pro & Flash models)
- **Build Tooling**: Vite

## The Design Process

The development and design of PPMP followed an iterative, component-driven methodology focused on robust state management and intelligent AI synthesis:

1.  **Architecture & State Foundation**:
    The core challenge was orchestrating a complex, interrelated graph of process steps (nodes). State management was explicitly isolated into components interacting with a global contextual state (managed in `App.tsx`) to coordinate visual representation in the editor, analysis in Insights, and relational validation in the Simulation.

2.  **AI-Centric Feature Expansion**:
    Instead of generic text generation, the Gemini AI was configured with rigid schema enforcement (`responseSchema`) and analytical formulas. It was programmed to calculate precise alignment weights based on provided user constraints vs. generated instructions to programmatically dictate simulation success.

3.  **UI/UX Refinements**:
    We heavily utilized Tailwind CSS to build a specialized, application-like desktop interface. Distinct views were formulated:
    *   *Design Editor*: A fluid, custom-built node graph interface.
    *   *Data Insights*: A side-by-side comparative layout with visual drag-and-drop cues to supply the AI with data.
    *   *Simulation*: A terminal-styled execution tracker emphasizing immediate visual feedback for validation failures.
    *   *Process Report*: Designed with specialized `print` CSS queries to effortlessly transition an on-screen web report to a clean, professional PDF or exportable HTML document.

4.  **Resilience & File Handling**:
    Given the complex structure of the mapped workflow data, a bespoke JSON serialization and deserialization layer was added. This allowed full state preservation without a complex backend, ensuring process blueprints stay secure on the client side while accommodating external file link management and local JSON state persistence.

## Getting Started

1. Set up your `.env.local` with your `GEMINI_API_KEY`.
2. Run `npm run dev` to start the development server.
3. Open the application, dive into the Design Editor to start mapping a process, pass it through Data Insights, validate it via the Simulation Engine, and generate your Project Process Report.
