# TaskFlow — Project Management Tool

A full-stack collaborative project management tool similar to Trello/Asana, built as part of the **CodeAlpha Internship Program 2025**.

## 🚀 Live Features

-  User Authentication (JWT)
-  Kanban Project Boards
-  Task Management with Drag & Drop
-  Real-time Comments
-  Live Notifications (WebSockets)
-  Team Member Management
-  Project Dashboard
-  Task Priority & Due Dates

##  Tech Stack

### Frontend
- HTML5, CSS3, JavaScript
- Phosphor Icons
- Socket.io Client

### Backend
- Node.js
- Express.js
- MongoDB & Mongoose
- Socket.io (WebSockets)
- JWT Authentication
- Bcrypt.js

##  Project Structure




##  Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/usmanola222/project-manager.git
cd project-manager
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create `.env` file

### 4. Run the app
```bash
npm run dev
```

### 5. Open in browser

##  API Endpoints

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register user |
| POST | `/api/users/login` | Login user |
| GET | `/api/users/profile` | Get profile |
| GET | `/api/users/notifications` | Get notifications |
| GET | `/api/users/search` | Search users |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects` | Create project |
| GET | `/api/projects` | Get all projects |
| GET | `/api/projects/:id` | Get one project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/members` | Add member |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/project/:id` | Get project tasks |
| GET | `/api/tasks/:id` | Get one task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PUT | `/api/tasks/:id/move` | Move task |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/comments` | Add comment |
| GET | `/api/comments/task/:id` | Get task comments |
| DELETE | `/api/comments/:id` | Delete comment |

##  WebSocket Events

| Event | Description |
|-------|-------------|
| `joinProject` | Join a project room |
| `taskAdded` | New task created |
| `taskUpdated` | Task moved/updated |
| `taskDeleted` | Task deleted |
| `commentAdded` | New comment added |
| `notification` | New notification |

##  Developer

**Usman Lawal Olasunkanmi**
- GitHub: [@usmanola222](https://github.com/usmanola222)
- Internship: CodeAlpha — 2025

##  License

This project was built for the CodeAlpha Internship Program.