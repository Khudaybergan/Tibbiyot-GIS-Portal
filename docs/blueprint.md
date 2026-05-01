# **App Name**: Tibbiyot GIS Portal

## Core Features:

- Public GIS Map Viewer: Display an interactive map featuring medical objects (clinics, pharmacies), airports, and administrative boundaries (regions, districts, mahallas). Includes map controls like zoom and layer toggles.
- Hierarchical Map Layer Filtering: Left sidebar with hierarchical controls for filtering and displaying administrative boundary layers (Viloyatlar, Tumanlar, Mahallalar) and object layers (Davlat klinikalari, Xususiy klinikalari, Dorixonalar, Aeroportlar, Kasalliklar, Jihozlar). Layers activate conditionally based on parent selections.
- Medical Object Information Display: Right panel to show detailed information for selected medical objects and aggregated statistics for selected territories, all with Uzbek Latin labels.
- Nearest Airport & Route Calculation: Identify the nearest airport to a selected medical facility using straight-line distance, and on user demand, calculate and visualize optimal driving routes using OSRM, displaying distance and estimated travel time.
- Public Map Search Functionality: Allow users to search medical objects on the public portal by name, address, or INN using a dedicated search input in the left sidebar.
- User Authentication: Implement a dedicated login page with Supabase authentication for accessing protected parts of the application, including email and password fields.
- Role-Based Admin Access: Ensure secure, role-based access to administrative pages (/admin) using Supabase, redirecting users based on their assigned roles (guest, operator, admin, super_admin).
- Admin Dashboard Overview: Provide a comprehensive dashboard within the admin panel displaying key statistics (e.g., total objects, clinics, pharmacies, import history) and system status.
- Admin Medical Object Management (CRUD): Enable administrators to view, create, edit, and archive medical object data through a table-based interface with search, filtering, and action buttons in the admin panel.
- Admin Data Import: Implement a step-by-step import process for uploading and validating GeoJSON, JSON, or CSV files for various layers. Includes file preview, validation error reporting, and automatic CRS conversion from EPSG:3857 to EPSG:4326 before inserting data into Supabase.

## Style Guidelines:

- Primary interactive elements use 'main blue' (#2563EB).
- Backgrounds use 'light gray' (#F8FAFC) for a clean, professional appearance.
- Panel backgrounds are 'white' (#FFFFFF) to ensure content clarity.
- Text and darker UI elements use 'dark navy' (#0F172A) for high readability.
- Contextual colors include green (#16A34A) for success, orange (#F59E0B) for warnings, and red (#EF4444) for danger states.
- Use clean, readable, and professional typography suitable for official, ministry-level documentation and applications, with all UI labels in Uzbek Latin.
- The public portal features a full-screen, three-column layout (left sidebar, center map, right panel).
- The admin panel employs a clear header with a left sidebar navigation for a professional dashboard style.
- General UI design emphasizes spacious elements, clear separation of components, and a clean, modern, ministry-level aesthetic with blue accents.
- Incorporate minimalist, clear, and professional icons that align with the official and clean design language.
- Utilize subtle and smooth transitions for interactive elements, such as map movements (e.g., flyTo/flyToBounds) and discreet loading states, to enhance user experience without distraction.
- General UI components feature rounded corners, subtle borders, soft shadows, and compact controls, avoiding excessive decorations for a focused and professional feel.