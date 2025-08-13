import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { User, IUser } from '../models/User'

export const configurePassport = (): void => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: '/api/auth/google/callback'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ googleId: profile.id })

          if (user) {
            // Update user info if needed
            user.name = profile.displayName || user.name
            user.avatar = profile.photos?.[0]?.value || user.avatar
            await user.save()
            return done(null, user)
          }

          // Create new user
          user = new User({
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value
          })

          await user.save()
          return done(null, user)
        } catch (error) {
          console.error('Google OAuth error:', error)
          return done(error, undefined)
        }
      }
    )
  )

  passport.serializeUser((user: any, done) => {
    done(null, user._id)
  })

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id)
      done(null, user)
    } catch (error) {
      done(error, null)
    }
  })
}
