import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/infra/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let email: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    email = `phase8-${Date.now()}@example.com`;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('registers, logs in, and refreshes access tokens', async () => {
    const password = 'password123';

    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, displayName: 'Phase Eight' })
      .expect(201);

    expect(registered.body).toMatchObject({
      user: { email, displayName: 'Phase Eight' },
      accessToken: expect.any(String),
    });
    expect(registered.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('quill_rt=')]),
    );

    const loggedIn = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loggedIn.body.accessToken).toEqual(expect.any(String));

    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', loggedIn.headers['set-cookie'])
      .expect(200);

    expect(refreshed.body).toEqual({
      accessToken: expect.any(String),
    });
  });
});
