# Node-RED + Seqera Welcome Tour

This directory contains a simple welcome tour system for Node-RED that shows a modal popup to first-time users.

## Files Created

- `welcome-tour.js` - JavaScript logic for the welcome popup
- Updated `node-red-seqera.css` - Added styling for the welcome modal
- Updated `settings.js` - Added configuration to load the tour

## How It Works

1. **First Visit**: When a user opens Node-RED for the first time, a welcome modal appears with:

   - Seqera branding and logo
   - Welcome message and basic instructions
   - "Get Started" button to dismiss

2. **Subsequent Visits**: The modal won't appear again (stored in browser localStorage)

3. **Dismissal**: Users can dismiss the modal by:
   - Clicking the "Get Started" button
   - Clicking outside the modal (on the backdrop)

## Testing the Welcome Tour

To test the welcome tour:

1. **Reset the tour**: Open browser Developer Tools (F12), go to Application/Storage tab, find localStorage, and delete the `seqera-welcome-shown` key

2. **Restart Node-RED**: The tour loads when the editor initializes

3. **Refresh the page**: The welcome modal should appear

## Customization

### Update the Welcome Message

Edit the content in `welcome-tour.js` around line 30-45 to customize:

- Welcome text
- Instructions
- Button text

### Update Styling

Modify the CSS classes in `node-red-seqera.css` starting around line 10:

- Colors and themes
- Modal size and positioning
- Animations

### Reset for All Users

To show the welcome to all users again, change the `WELCOME_SHOWN_KEY` value in `welcome-tour.js` (line 8).

## Technical Notes

- Uses localStorage to track dismissal state per browser
- Waits for Node-RED editor to fully initialize before showing
- Compatible with your existing Seqera branding
- Responsive design works on mobile and desktop
- No external dependencies

## Files Structure

```
studios-template/
├── welcome-tour.js          # Tour logic
├── node-red-seqera.css     # Styles (updated)
├── node-red-seqera.svg     # Logo (existing)
├── settings.js             # Node-RED config (updated)
└── WELCOME_TOUR_README.md  # This file
```
