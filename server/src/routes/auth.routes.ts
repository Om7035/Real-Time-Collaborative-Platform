import { Router } from 'express';
import { authController } from '../auth/auth.controller';

const router = Router();

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
router.post('/validate', (req, res) => authController.validate(req, res));

export default router;
