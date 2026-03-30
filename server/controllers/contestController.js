const Contest    = require('../models/Contest');
const Submission = require('../models/Submission');
const Problem    = require('../models/Problem');

// ── Helper ────────────────────────────────────────────────────────────────────

function computeStatus(contest) {
    const now = new Date();
    if (now < contest.startTime) return 'upcoming';
    if (now <= contest.endTime)  return 'active';
    return 'ended';
}

// ── GET /api/contests ─────────────────────────────────────────────────────────
// Public: list of all public contests with basic info
exports.getAllContests = async (req, res) => {
    try {
        const contests = await Contest.find({ isPublic: true })
            .populate('createdBy', 'username')
            .select('title description createdBy startTime endTime isPublic participants problems')
            .sort({ startTime: -1 });

        const result = contests.map(c => {
            const obj = c.toObject({ virtuals: true });
            obj.participantCount = c.participants.length;
            obj.problemCount     = c.problems.length;
            // Do not expose participants array or problem details in the list
            delete obj.participants;
            return obj;
        });

        res.json({ contests: result });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── GET /api/contests/:id ─────────────────────────────────────────────────────
// Public: full contest details. Problems are not revealed before startTime
// unless the requesting user is the contest creator or an admin.
exports.getContestById = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id)
            .populate('createdBy', 'username profilePicture')
            .populate('problems.problem', 'title difficulty tags acceptanceRate');

        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        const status         = computeStatus(contest);
        const isOwner        = req.userId && contest.createdBy._id.toString() === req.userId;
        const hasStarted     = status === 'active' || status === 'ended';
        const isParticipant  = req.userId
            ? contest.participants.some(p => p.toString() === req.userId)
            : false;

        const obj = contest.toObject({ virtuals: true });
        obj.status          = status;
        obj.participantCount = contest.participants.length;
        obj.isParticipant    = isParticipant;

        // Hide problem list before contest starts (unless creator)
        if (!hasStarted && !isOwner) {
            obj.problems = [];
            obj.problemsHidden = true;
        }

        // Never expose the full participants array
        delete obj.participants;

        res.json({ contest: obj });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── POST /api/contests ────────────────────────────────────────────────────────
// Teacher/Admin: create a new contest
exports.createContest = async (req, res) => {
    try {
        const { title, description, startTime, endTime, problems, isPublic } = req.body;

        if (!title || !startTime || !endTime) {
            return res.status(400).json({ message: 'title, startTime and endTime are required' });
        }
        if (new Date(startTime) >= new Date(endTime)) {
            return res.status(400).json({ message: 'endTime must be after startTime' });
        }

        // Validate that all referenced problems exist
        const problemIds = (problems || []).map(p => p.problem || p);
        if (problemIds.length > 0) {
            const found = await Problem.find({ _id: { $in: problemIds } }).select('_id');
            if (found.length !== problemIds.length) {
                return res.status(400).json({ message: 'One or more problem IDs are invalid' });
            }
        }

        const contest = new Contest({
            title,
            description: description || '',
            createdBy: req.userId,
            startTime: new Date(startTime),
            endTime:   new Date(endTime),
            problems:  (problems || []).map(p => ({
                problem: p.problem || p,
                points:  p.points  || 100
            })),
            isPublic: isPublic !== undefined ? isPublic : true
        });

        await contest.save();

        const populated = await Contest.findById(contest._id)
            .populate('createdBy', 'username')
            .populate('problems.problem', 'title difficulty');

        res.status(201).json({ message: 'Contest created successfully', contest: populated });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A contest with that title already exists' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── PUT /api/contests/:id ─────────────────────────────────────────────────────
// Teacher: update their own contest (blocked if already started)
exports.updateContest = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id);
        if (!contest) return res.status(404).json({ message: 'Contest not found' });

        // Only the creator (or admin) may edit
        const isOwner  = contest.createdBy.toString() === req.userId;
        const isAdmin  = req.userRole === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'You do not own this contest' });
        }

        // Block edits to startTime/endTime if the contest has already started
        const status = computeStatus(contest);
        if (status === 'active' || status === 'ended') {
            return res.status(400).json({
                message: 'Contest has started — only title and description can be changed'
            });
        }

        const { title, description, startTime, endTime, problems, isPublic } = req.body;

        if (title)       contest.title       = title;
        if (description !== undefined) contest.description = description;
        if (startTime)   contest.startTime   = new Date(startTime);
        if (endTime)     contest.endTime     = new Date(endTime);
        if (isPublic  !== undefined) contest.isPublic  = isPublic;
        if (problems) {
            contest.problems = problems.map(p => ({
                problem: p.problem || p,
                points:  p.points  || 100
            }));
        }

        if (new Date(contest.startTime) >= new Date(contest.endTime)) {
            return res.status(400).json({ message: 'endTime must be after startTime' });
        }

        await contest.save();
        const updated = await Contest.findById(contest._id)
            .populate('createdBy', 'username')
            .populate('problems.problem', 'title difficulty');

        res.json({ message: 'Contest updated successfully', contest: updated });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── DELETE /api/contests/:id ──────────────────────────────────────────────────
// Teacher: delete their own contest (only if not yet ended)
exports.deleteContest = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id);
        if (!contest) return res.status(404).json({ message: 'Contest not found' });

        const isOwner = contest.createdBy.toString() === req.userId;
        const isAdmin = req.userRole === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'You do not own this contest' });
        }

        await contest.deleteOne();
        res.json({ message: 'Contest deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── POST /api/contests/:id/join ───────────────────────────────────────────────
// Authenticated student: join a contest (idempotent)
exports.joinContest = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id);
        if (!contest) return res.status(404).json({ message: 'Contest not found' });

        if (!contest.isPublic) {
            return res.status(403).json({ message: 'This contest is private' });
        }

        const status = computeStatus(contest);
        if (status === 'ended') {
            return res.status(400).json({ message: 'Contest has already ended' });
        }

        // Idempotent join via $addToSet
        await Contest.findByIdAndUpdate(req.params.id, {
            $addToSet: { participants: req.userId }
        });

        res.json({ message: 'Joined contest successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── GET /api/contests/:id/leaderboard ────────────────────────────────────────
// Authenticated: available after contest ends, OR for the contest owner / admin during active
exports.getLeaderboard = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id)
            .populate('problems.problem', 'title');

        if (!contest) return res.status(404).json({ message: 'Contest not found' });

        const status  = computeStatus(contest);
        const isOwner = req.userId && contest.createdBy.toString() === req.userId;

        // Fetch user's role for admin check
        let isAdmin = false;
        if (req.userId) {
            const User = require('../models/User');
            const u = await User.findById(req.userId).select('role');
            isAdmin = u?.role === 'admin';
        }

        // Block leaderboard if contest hasn't ended, unless viewer is owner or admin
        if (status !== 'ended' && !isOwner && !isAdmin) {
            return res.status(403).json({
                message: 'Leaderboard is only available after the contest ends'
            });
        }

        // Build a map: problemId → points
        const pointsMap = {};
        for (const cp of contest.problems) {
            pointsMap[cp.problem._id.toString()] = cp.points;
        }

        // Fetch all Accepted submissions for this contest, oldest first
        const submissions = await Submission.find({
            contest: contest._id,
            status:  'Accepted'
        })
            .populate('user', 'username profilePicture')
            .sort({ createdAt: 1 });

        // Aggregate: per user, first accepted submission per problem
        const board = {};  // { userId: { user, totalPoints, solvedSet, lastTime } }

        for (const sub of submissions) {
            if (!sub.user || !sub.problem) continue;

            const uid = sub.user._id.toString();
            const pid = sub.problem.toString();

            if (!board[uid]) {
                board[uid] = {
                    user:        sub.user,
                    totalPoints: 0,
                    solvedSet:   new Set(),
                    lastTime:    sub.createdAt
                };
            }

            // All-or-nothing: only first accepted submission per problem counts
            if (!board[uid].solvedSet.has(pid)) {
                board[uid].solvedSet.add(pid);
                board[uid].totalPoints += (pointsMap[pid] || 0);
                board[uid].lastTime = sub.createdAt;
            }
        }

        // Sort: most points first; ties broken by earlier last submission time
        const ranked = Object.values(board)
            .sort((a, b) => {
                if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                return new Date(a.lastTime) - new Date(b.lastTime);
            })
            .map((entry, idx) => ({
                rank:           idx + 1,
                user:           {
                    id:             entry.user._id,
                    username:       entry.user.username,
                    profilePicture: entry.user.profilePicture
                },
                totalPoints:    entry.totalPoints,
                problemsSolved: entry.solvedSet.size,
                lastSubmission: entry.lastTime
            }));

        res.json({
            contest: { title: contest.title, endTime: contest.endTime },
            leaderboard: ranked
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── GET /api/contests/my ──────────────────────────────────────────────────────
// Teacher: list contests they created
exports.getMyContests = async (req, res) => {
    try {
        const contests = await Contest.find({ createdBy: req.userId })
            .populate('problems.problem', 'title difficulty')
            .sort({ startTime: -1 });

        const result = contests.map(c => {
            const obj = c.toObject({ virtuals: true });
            obj.participantCount = c.participants.length;
            obj.status = computeStatus(c);
            return obj;
        });

        res.json({ contests: result });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
