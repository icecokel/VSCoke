<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

# VSCoke API

이 프로젝트는 [VSCoke](https://github.com/icecokel/VSCoke) 모노레포의 백엔드 앱입니다.
VSCode와 유사한 웹 IDE 경험을 제공하기 위한 서버 측 로직과 API를 담당합니다.

## 🔗 Related Project

- **Frontend**: [VSCoke (Web IDE Client)](https://github.com/icecokel/VSCoke)

## 🛠 Tech Stack

### Framework & Runtime

- **Node.js**: Server Runtime
- **NestJS**: Main Backend Framework (TypeScript)

### Database & ORM

- **PostgreSQL**: Relational Database
- **ORM**: (TypeORM 또는 Prisma 등 사용 예정, 현재는 ORM 사용 명시)

## Project setup

```bash
$ pnpm install
```

## Environment Variables

`apps/api/.env.example`을 `apps/api/.env`로 복사한 뒤 실제 값을 채웁니다. 운영 환경 변수 기준은 [Deployment and Environment Plan](../../docs/deployment-and-env.md)을 따릅니다.

최소한 아래 값은 실제 환경에 맞게 설정해야 합니다.

```env
GOOGLE_CLIENT_ID=<google-oauth-client-id>
DB_SYNCHRONIZE=false
```

개발 환경에서만 인증 우회를 쓸 경우:

```env
ENABLE_DEV_AUTH_BYPASS=true
DEV_AUTH_TOKEN=<local-dev-token>
```

## Compile and run the project

```bash
# development
$ pnpm --filter @vscoke/api start

# watch mode
$ pnpm --filter @vscoke/api start:dev

# production mode
$ pnpm --filter @vscoke/api start:prod
```

## Run tests

```bash
# unit tests
$ pnpm --filter @vscoke/api test

# e2e tests
$ pnpm --filter @vscoke/api test:e2e

# test coverage
$ pnpm --filter @vscoke/api test:cov
```

## Deployment

VSCoke API는 GitHub Actions로 Termux 서버에 배포하고 PM2로 실행합니다.

- API 배포 가이드: [DEPLOY.md](DEPLOY.md)
- Monorepo 배포/환경 변수 기준: [Deployment and Environment Plan](../../docs/deployment-and-env.md)

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
