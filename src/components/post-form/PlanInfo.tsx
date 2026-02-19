import { useEffect, useState } from 'react';
import { ChronoskyClient } from '../../lib/chronosky-xrpc-client';
import type { PlanAssignment, PlanUsage } from '../../lib/chronosky-xrpc-client';
import { OAuthSession } from '@atproto/oauth-client-browser';

interface PlanInfoProps {
  session: OAuthSession;
}

export function PlanInfo({ session }: PlanInfoProps) {
  const [assignment, setAssignment] = useState<PlanAssignment | null>(null);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlanInfo = async () => {
      try {
        const client = new ChronoskyClient((url, init) => session.fetchHandler(url, init));
        const [assignmentRes, usageRes] = await Promise.all([
          client.getAssignment(),
          client.getUsage(),
        ]);
        setAssignment(assignmentRes.assignment);
        setUsage(usageRes.usage);
      } catch (error) {
        console.error('Failed to fetch plan info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanInfo();
  }, [session]);

  if (loading) return null;
  if (!assignment) return null;

  return (
    <div className="plan-info" style={{ 
      padding: '8px 16px', 
      background: 'var(--bg-color-secondary)', 
      borderBottom: '1px solid var(--border-color)',
      fontSize: '0.8rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{assignment.planName}</span> Plan
      </div>
      <div style={{ display: 'flex', gap: 12, color: 'var(--text-color-secondary)' }}>
        <span>
          <i className="fa-solid fa-layer-group" style={{ marginRight: 4 }}></i>
          {usage?.concurrentPosts || 0} / {assignment.limits.maxConcurrentPosts} Queue
        </span>
        <span>
          <i className="fa-solid fa-calendar-day" style={{ marginRight: 4 }}></i>
          {usage?.postsToday || 0} / {assignment.limits.maxPostsPerDay} Today
        </span>
      </div>
    </div>
  );
}
