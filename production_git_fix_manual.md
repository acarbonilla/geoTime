# Production Git Fix - Manual Steps

## Problem
Your production server has divergent branches and needs to be configured to handle the reconciliation.

## Solution

### Step 1: SSH into your production server
```bash
ssh user@your-production-server-ip
```

### Step 2: Navigate to your application directory
```bash
cd /home/geotime/geoTime
```

### Step 3: Configure git user (if not already configured)
```bash
# Set your git user email and name
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"

# Or set it only for this repository (recommended for production)
git config user.email "your-email@example.com"
git config user.name "Your Name"
```

### Step 4: Configure git pull strategy
```bash
git config pull.rebase false
```

### Step 5: Fetch latest changes
```bash
git fetch origin
```

### Step 6: Check current status
```bash
git status
```

### Step 7: Pull latest changes
```bash
git pull origin main
```

### Step 8: Verify the fix
```bash
git status
```

## Alternative: If you encounter conflicts

If the pull fails with conflicts, you can force reset to match the remote:

```bash
# WARNING: This will discard any local changes
git fetch origin
git reset --hard origin/main
```

## What this does

1. **`git config user.email` and `git config user.name`** - Sets up git user identity for commits
2. **`git config pull.rebase false`** - Configures git to use merge strategy instead of rebase when pulling
3. **`git fetch origin`** - Downloads the latest changes without merging them
4. **`git pull origin main`** - Merges the remote changes with your local branch

## After running these commands

Your production server should now be able to pull updates without the divergent branches error. You can then run your normal deployment scripts:

```bash
# If using the update script
./update.sh

# Or if using the quick update script
./quick_update.sh
```
