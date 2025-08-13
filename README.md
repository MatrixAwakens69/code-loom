# CodeLoom

A sophisticated real-time collaborative code editor with voice chat, built for modern development teams.

![CodeLoom Demo](https://via.placeholder.com/800x400/1e1e1e/ffffff?text=CodeLoom+Collaborative+IDE)

## 🚀 Features

### Core Collaboration
- **Real-time Code Editing** - Multiple users can edit code simultaneously with conflict resolution
- **Live Cursors & Selections** - See where team members are working in real-time
- **File Management** - Create, edit, and organize project files collaboratively
- **Permission System** - Granular access control (view/edit permissions per user)

### Communication
- **Integrated Voice Chat** - WebRTC-powered voice communication for seamless team discussions
- **Real-time Notifications** - Stay updated on team member activities
- **User Presence** - See who's online and actively working

### Developer Experience
- **Monaco Editor** - Full VS Code editing experience with syntax highlighting
- **Multi-language Support** - JavaScript, TypeScript, Python, Java, C++, and more
- **Project Dashboard** - Manage multiple projects and team invitations
- **Responsive Design** - Works seamlessly across desktop and mobile devices

### Authentication & Security
- **Google OAuth** - Secure authentication with Google accounts
- **JWT Tokens** - Secure session management
- **Environment-based Configuration** - Separate development and production settings

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for responsive styling
- **Monaco Editor** for code editing
- **Socket.io Client** for real-time communication
- **WebRTC** for peer-to-peer voice chat

### Backend
- **Node.js** with Express
- **Socket.io** for real-time collaboration
- **MongoDB** with Mongoose for data persistence
- **Passport.js** with Google OAuth2 strategy
- **JWT** for authentication
- **WebRTC signaling** for voice chat coordination

### Infrastructure
- **GitHub Pages** for frontend deployment
- **Render** for backend deployment
- **MongoDB Atlas** for database hosting
- **GitHub Actions** for CI/CD

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Google OAuth credentials

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/code-loom.git
   cd code-loom
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure environment variables**
   ```bash
   # Copy example files
   cp server/env.example server/.env
   cp client/env.example client/.env
   
   # Edit with your configuration
   nano server/.env
   nano client/.env
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

For detailed setup instructions, see [SETUP.md](./SETUP.md).

## 📖 Usage

### Creating a Project
1. Sign in with Google OAuth
2. Click "New Project" on the dashboard
3. Configure project settings and permissions
4. Start coding collaboratively!

### Inviting Team Members
1. Open your project
2. Click the "Invite" button
3. Enter email addresses and set permissions
4. Team members will receive invitations via email

### Voice Communication
1. Click the microphone icon in the project editor
2. Allow microphone access when prompted
3. Other team members can join the voice chat
4. Use mute/unmute controls as needed

## 🏗 Project Structure

```
code-loom/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Auth, Socket)
│   │   ├── pages/          # Page components
│   │   └── hooks/          # Custom React hooks
│   ├── public/             # Static assets
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── config/         # Configuration files
│   │   └── collaboration/  # Real-time collaboration logic
│   └── package.json
├── package.json            # Root package.json for development scripts
├── SETUP.md               # Detailed setup instructions
└── README.md              # This file
```

## 🚀 Deployment

### Frontend (GitHub Pages)
1. Push your code to GitHub
2. Configure GitHub secrets for environment variables
3. Enable GitHub Pages with GitHub Actions
4. Automatic deployment on push to main branch

### Backend (Render)
1. Connect your GitHub repository to Render
2. Configure environment variables in Render dashboard
3. Deploy with automatic builds on git push

See [SETUP.md](./SETUP.md) for detailed deployment instructions.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the excellent code editing experience
- [Socket.io](https://socket.io/) for real-time communication
- [React](https://reactjs.org/) for the frontend framework
- [TailwindCSS](https://tailwindcss.com/) for styling
- All contributors and supporters of this project

## 📞 Support

If you have any questions or need help:
- 📧 Email: support@codeloom.dev
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/code-loom/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-username/code-loom/discussions)

---

**Built with ❤️ for developers, by developers.**
