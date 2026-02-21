"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "motion/react";

const metrics = [
  { value: "<50ms", label: "Skill load time" },
  { value: "50+", label: "Pre-built skills" },
  { value: "100%", label: "Type-safe" },
];

const chartData = [
  { tool: "Omniscient", score: 95 },
  { tool: "Custom Solutions", score: 60 },
  { tool: "Manual Setup", score: 40 },
];

const methodologyDetails = [
  "Next.js 16 with App Router",
  "Hono for lightweight API",
  "Better Auth for authentication",
  "Neon Serverless Postgres",
];

const exampleTabs = ["Data Processing", "API Integration"];

const examples = [
  {
    tab: "Data Processing",
    description: "Build a skill that processes and transforms data",
    noContext: {
      label: "Without Omniscient",
      code: "# Custom setup required\n# Multiple files to manage\n# No sharing between agents",
    },
    withOmniscient: {
      label: "With Omniscient",
      code: 'import { skill } from "@omniscient/core"\n\n@skill({\n  name: "data-processor",\n  inputs: ["json", "csv"],\n  outputs: ["processed"],\n})\nasync function processData(input) {\n  return transform(input);\n}',
    },
  },
];

export default function Benchmark() {
  const chartRef = useRef(null);
  const isInView = useInView(chartRef, { once: true, margin: "-100px" });
  const [activeTab, setActiveTab] = useState(0);

  const maxScore = Math.max(...chartData.map((d) => d.score));

  return (
    <section id="benchmark" className="py-32 px-6 md:px-16">
      <div className="max-w-[1280px] mx-auto">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-primary mb-4">
            BUILT DIFFERENT
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-[700px] mx-auto leading-relaxed">
            Omniscient is built from the ground up for the agent era.
          </p>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="border border-border p-8 mb-8"
        >
          <p className="text-xs text-primary uppercase tracking-[0.05em] mb-8">Key Metrics</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {metrics.map((metric, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl lg:text-6xl font-semibold text-primary mb-2">
                  {metric.value}
                </div>
                <div className="text-sm text-muted-foreground">{metric.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Chart + Methodology */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <motion.div
            ref={chartRef}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="border border-border p-8"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-[0.05em]">
                Developer Experience
              </p>
              <p className="text-xs text-muted-foreground">Hover to inspect</p>
            </div>
            <p className="text-xs text-muted-foreground mb-8">Skills built per month</p>

            <div className="relative">
              <div className="absolute left-8 right-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
                {[100, 80, 60, 40, 20, 0].map((val) => (
                  <div key={val} className="flex items-center">
                    <span className="text-[10px] text-muted-foreground w-8 text-right mr-2">
                      {val}%
                    </span>
                    <div className="flex-1 border-b border-border/50" />
                  </div>
                ))}
              </div>

              <div className="flex items-end gap-2 justify-between pl-10 h-56 pt-4 pb-8">
                {chartData.map((item, index) => (
                  <div key={item.tool} className="flex flex-col items-center gap-1 flex-1">
                    <div className="relative w-full flex justify-center">
                      {index === 0 && (
                        <span className="absolute -top-5 text-[10px] text-foreground bg-primary/20 px-1.5 py-0.5">
                          {item.score}%
                        </span>
                      )}
                      <div
                        className="w-full max-w-[40px] transition-all duration-1000 ease-out"
                        style={{
                          height: isInView ? `${(item.score / maxScore) * 180}px` : "0px",
                          transitionDelay: `${index * 100}ms`,
                          backgroundColor:
                            index === 0
                              ? "var(--primary)"
                              : `rgba(140, 140, 140, ${0.7 - index * 0.15})`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pl-10 gap-2">
                {chartData.map((item) => (
                  <div
                    key={item.tool}
                    className="flex-1 text-center text-[9px] text-muted-foreground leading-tight"
                  >
                    {item.tool}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary" />
                <span className="text-xs text-foreground">{chartData[0].tool}</span>
              </div>
              <span className="text-xs text-primary font-medium">{chartData[0].score}%</span>
              <span className="text-xs text-muted-foreground">&mdash;</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="border border-border p-8"
          >
            <p className="text-xs text-primary uppercase tracking-[0.05em] mb-6">Tech Stack</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Built with modern technologies for maximum performance and developer experience.
            </p>
            <div className="space-y-3 mb-6">
              {methodologyDetails.map((detail, i) => (
                <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                  {detail}
                </p>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
