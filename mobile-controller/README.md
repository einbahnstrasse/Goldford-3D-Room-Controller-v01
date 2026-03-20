# Mobile Controller for Spatial Audio System

A Next.js Progressive Web App (PWA) that provides mobile control for spatial audio sources using device gyroscope data.

## Deployment History - January 17, 2025

**Problem**: Need to deploy mobile-controller subfolder to Vercel from private GitHub repo.

**Solutions Attempted**:
1. ❌ **Vercel Root Directory Setting**: Set root to `mobile-controller` - didn't work properly
2. ❌ **vercel.json Configuration**: Added build/output directory config - still failed
3. ✅ **GitHub Actions + Vercel CLI**: Successfully deployed using workflow automation

**Final Working Solution**:
- GitHub Actions workflow triggers on mobile-controller folder changes
- Uses Vercel CLI to deploy directly from subfolder
- Configured Next.js for static export (`output: 'export'`)
- Set Vercel output directory to `out` (not `.next`)
- App now accessible at: https://lg-3d-room-v01.vercel.app/

**Key Issues Resolved**:
- Path conflicts when Vercel looked for `mobile-controller/mobile-controller`
- Static export configuration for proper deployment
- Production override settings in Vercel dashboard

## Current Status
- ✅ Deployed and accessible via web and PWA
- 🔄 Next: Implement real gyroscope access and OSC communication

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
