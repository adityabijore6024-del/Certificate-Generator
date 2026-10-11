# GDG On Campus AITR Portal - Audit & Suggestions Report

This document presents a structured review, identified UX/UI issues, and actionable feature suggestions for the GDG On Campus AITR web portal (`https://gdgocaitr.vercel.app/`).

---

## 1. Identified Bugs & UI Glitches

### 1.1 Header Clipping Bug on Mobile (`/certificate` route)
- **Observation:** On mobile screens under the "Your Certificate" page, the primary section title is partially clipped/obscured behind the fixed top navigation bar.
- **Impact:** Breaks visual hierarchy and indicates improper top margin/padding on internal routes.
- **Fix:** Ensure uniform scroll-padding-top or standard container offset (e.g., `pt-20` / `padding-top: calc(nav-height + 1rem)`) across all internal viewports.

### 1.2 Dark Mode Transition Stutter & Latency
- **Observation:** Toggling between Light and Dark mode introduces a noticeable frame-drop/lag rather than transitioning smoothly.
- **Impact:** Degrades overall responsiveness, especially on mobile browsers during runtime CSS recalculations.
- **Fix:** Avoid re-rendering deep component trees on theme change. Utilize pure CSS root variable swapping or the Tailwind `dark` class applied directly to the document root without unnecessary repaints.

### 1.3 Mobile Navigation Bar Compression
- **Observation:** The GDG logo mark and title subtitle text ("On Campus • AITR") appear cramped horizontally adjacent to the theme toggle and hamburger icons on standard mobile viewports (< 380px width).
- **Fix:** Hide or shorten secondary text ("On Campus • AITR") on smaller screens, keeping only the GDG branding mark and acronym to maintain clean spacing.

---

## 2. Content & UX Improvements

### 2.1 Incomplete Chapter History in "About Us"
- **Observation:** While mission statements and stats are displayed, the background story, chapter foundation year, and foundational milestones of GDG AITR are missing.
- **Impact:** Prospective student members miss out on community legacy and growth milestones.
- **Fix:** Add an interactive timeline detailing the chapter's evolution and community achievements over the years.

### 2.2 Event Status & Context Discrepancy
- **Observation:** In the "Featured & Upcoming Events" section, past workshops (e.g., "Build with AI") display both a "Past Event" / "Closed" pill alongside "6 seats left", which can create user confusion.
- **Fix:** Conditionally hide seat counters when an event status is set to "Closed" or "Past Event".

---

## 3. Recommended Feature Additions

### 3.1 Direct Google Calendar / RSVP Sync
- Provide a single-click "Add to Google Calendar" button on upcoming announcements and event detail cards to improve student attendance rates.

### 3.2 Student Project & Open-Source Showcase
- Introduce a dedicated showcase section highlighting technical projects and hackathon submissions built by chapter members to promote peer collaboration.

### 3.3 Enhanced Empty States Action Flow
- Current empty states (e.g., "No registrations yet", "No certificates yet") are clean, but adding a short FAQ tooltip or direct link to past event recap resources would improve onboarding engagement.

---

## 4. Summary
The portal has a polished modern design and clean information architecture. Resolving the top padding clipping bug, optimizing the dark mode CSS transition overhead, and expanding chapter historical documentation will significantly elevate the site's production quality.