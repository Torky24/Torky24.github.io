---
title: "The agent platform at neuland.ai"
kind: project
status: ""
featured: true
year: "2026"
summary: "A shared workspace where people work alongside an agent that has tools, a sandbox, files and its own sub-agents. This is where most of my time goes: I’ve built a lot of what sits underneath it, introduced always-on agents, and built the agent harness that beats Codex and Claude Code on Terminal-Bench in our internal runs."
tags: ["Agent runtime", "Durable streams", "Always-on agents", "Authorization", "Python", "TypeScript", "Postgres", "Kubernetes"]
order: 0
---

This is where most of my time goes. neuland.ai’s agent platform is a shared workspace: people talk to an agent that has tools, a sandbox, files and its own sub-agents, and several people can work with the same agent at once. It runs in production for a lot of users, and we load-test it heavily. I work on it with a small team, on the server and on the web client, where I also design how people actually work with the agent. Here are the parts I built, and the problems they solve.

## Keeping a turn alive

Every agent turn runs through one loop. It picks up new messages between steps, keeps the conversation within the model’s context, calls the model and runs whatever tools it asks for. The important part is that every change is written down as a record first. If a process dies halfway through, a new one reads the same records and ends up in exactly the same place. After a crash, a tool call is only retried if we know it’s safe to run twice.

I also reworked how tools are described. Instead of a hand-wired list of tool classes, each tool now says what it needs, whether it’s safe to repeat and whether it can run alongside others, and the runtime takes it from there: what to offer the model, what to ask a person about, and what to rerun after a crash.

On top of that I built tool discovery for plugins and custom tools. The model always sees a small core set, and finds everything else when it needs it by searching, reading a tool’s description and then calling it. Prompts stay much smaller, and the agent picks the right tool more often than when every tool is crammed into the context.

Agents can hand work to sub-agents, each with its own transcript and sandbox. Every sub-agent runs under a lease, so if one gets lost it’s rebuilt or wrapped up instead of being started twice. Long conversations are summarised in the background before they reach the limit, and the prompt is rebuilt from the log, so it comes out the same after a restart and stays friendly to prompt caching. People can nudge a running turn, and Stop is written down before anything is cancelled, so even a crash in the middle of stopping still ends as a stop.

## Running lots of agents at once

A new message goes straight onto the workspace’s durable stream, and a supervisor picks it up and drives the turn. The sandbox only boots when it’s actually needed. To make sure two machines never run the same step, the process driving a turn holds a Postgres lease with an epoch, and the stream refuses writes from an older one.

We also wrote the turn, plan and approval states down as explicit state machines and shared them with the web client. That gave every screen the same answer to “is this running, can I stop it, does it need me?”, and it helped us find and fix places where two screens disagreed.

## Durable streams

Each workspace has its own durable stream, an append-only log that everything is rebuilt from: chat, turn state, plans, approvals and spend. Writers are strict and readers are forgiving, so old and new versions can read each other’s streams during a rollout. Every write carries a producer id and a sequence number, so a retried message is written once, even when it lands on another replica, and the Postgres read model applies each record exactly once. Checkpoints keep reads short, and the same stream is what clients follow live, picking up where they left off with a signed cursor.

The biggest piece here was moving every stored stream to a new format. We made readers tolerant first, then wrote a migration tool that refused any translation that would change what the model or a person sees. A second stream server ran side by side behind a switch we could flip back, production moved over, and once everything had settled we deleted the migration tool.

## Storage first, compute second

These days I design around object storage rather than compute. Durable state goes into buckets, and the services that work on it stay stateless. Scaling a bucket is the cloud provider’s problem and cheap; scaling stateful compute means moving data around, rebalancing and looking after disks. With state in object storage, any machine can pick up any piece of work, a crashed one loses nothing, and adding capacity is just starting more containers.

The industry calls this separating storage and compute, and its newer, stricter form is zero-disk or diskless architecture. [WarpStream](https://www.warpstream.com/blog/kafka-is-dead-long-live-kafka) runs Kafka-compatible streaming on stateless agents over S3, and [ClickHouse Cloud](https://clickhouse.com/blog/clickhouse-cloud-stateless-compute) made its compute fully stateless in 2025. A lot of systems are heading this way, and it suits agents especially well, because an agent’s state is already a log you can rebuild from.

## Always-on agents, and swarms next

I built and introduced always-on agents on the platform: agents that keep working in the background, instead of only while someone is chatting with them.

The next thing I’ve just started on is agent swarms. It’s still in progress, so more on that once there’s something to show.

## Letting agents act for people, safely

An agent should never be able to do more than the person it’s working for. So every tool call is checked twice: is there a grant that covers it, and does that person still have the right to do it themselves? Agents never hold credentials. The product asks the identity service on each call, and one place makes the decision, fails closed and keeps a record.

When nothing covers a call, the agent asks. People can allow it once, always, or say no, and a one-time yes is handed back if the call never actually ran. In shared workspaces, each person lends the agent their own tools and data, every grant remembers who gave it, and each call stays within that person’s rights. I moved the platform to this model in a long series of small, carefully tested steps that ended in a migration we could reverse. When someone leaves, their agents, grants and tokens go with them.

## Sandboxes

Each agent and sub-agent gets its own microVM with the workspace’s files mounted. It boots the first time it’s needed and recovers on its own after a failed boot. Network access goes through a gate per sandbox: code can only reach hosts a person approved, those approvals don’t last long, and things get stricter once the code has touched private data.

## Talking to models

All model calls go through one streaming interface across several providers and three clouds. Whatever the source, provider events become the same kind of update, and partial output survives a broken stream. Throttling is retried with backoff, even the kind that shows up inside an otherwise successful response, and a deadline on the first response catches requests that hang. Every call’s usage is normalised, charged to the right payer and recorded once, including calls that failed or were cancelled.

## Documents and pipelines

I also worked on OCR and on the data-processing pipelines around it, running on Ray. That work is where [rasterix](#/research/rasterix) came from.

## How it measures up

I built the agent harness that produced these numbers. In our internal runs it reaches state-of-the-art results on Terminal-Bench 2.0 and 2.1, ahead of Codex and Claude Code, while using about three times fewer tokens than Codex. On Databricks’ OfficeQA Pro V2, which asks agents to reason across two centuries of U.S. federal financial records, it beats Databricks Genie. I also led our entry on the public [BrowseComp-Plus leaderboard](https://huggingface.co/spaces/Tevatron/BrowseComp-Plus), and it stands out on the two things that matter most for a search agent you want to trust: it has the lowest calibration error of all 76 scored entries, so its confidence closely matches how often it’s actually right, and it makes the fewest searches of any entry above 85% accuracy. The cleanest comparison is LightOn’s entry, which uses the same model and the same retriever. We reach the same accuracy with 39% fewer searches and 2.7× lower calibration error, so the agent is the only thing that differs.

## Several people, one agent

Each turn runs as the person who sent the message, and anyone in the workspace can steer it. The model is told who’s around and who added what, with names flattened to a single line so nobody can slip an instruction in through their display name.

## Seeing what agents do

When an agent misbehaves, you need to see what it actually did. I set up tracing, metrics and observability for the platform on SigNoz, including spans for everything in a turn that isn’t model time: tool calls, building the context, waiting for a sandbox, waiting for someone to approve. Raw traces are great for engineers but hard for anyone else to read, so I also built our own trace view in the app: one row per shell command the agent ran, with its network requests right underneath.

## How people work with agents

I don’t only build the backend; I also design how people interact with the agent in the web client. You can see what it’s doing right now, including sub-agents and connector calls. Approval requests show up as clear cards saying exactly what the agent wants to do. Messages sent mid-turn wait as bubbles you can take back, Stop tells you what it stopped, and every connector call shows whose access it used.

## Keeping it tidy

A lot of this autumn went into rebuilding the server in small, reviewed pull requests, with a few simple rules: a move changes nothing, a bug fix comes with a test that fails without it, and imports only point one way. I also added a CI check so no change can add new type errors, and fixed some gates that had quietly been skipping. I use AI coding agents every day, and I still read and own every change that ships.

Built with Python (asyncio, FastAPI, Ray), TypeScript and React, Postgres, Redis, SigNoz, and Kubernetes on Azure with Terraform.
