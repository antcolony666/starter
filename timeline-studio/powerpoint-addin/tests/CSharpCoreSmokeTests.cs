using System;
using Tempo.TimelineAddin;

internal static class CSharpCoreSmokeTests
{
    private static int Main()
    {
        TimelineData sample = TimelineData.CreateSample();
        Assert(sample.Validate().Count == 0, "sample data should validate");
        TimelineLayout detailed = TimelineLayoutEngine.Calculate(sample, false);
        TimelineLayout overview = TimelineLayoutEngine.Calculate(sample, true);
        Assert(detailed.Lanes.Count == 4, "four lanes expected");
        Assert(detailed.Tasks.Count == 8, "eight regular task bars expected");
        Assert(detailed.Milestones.Count == 1, "one milestone expected");
        Assert(detailed.Months.Count >= 4, "timeline crosses four calendar months");
        Assert(detailed.Tasks[0].Bar.Height > overview.Tasks[0].Bar.Height, "detailed bars should be taller");
        foreach (TaskLayout task in detailed.Tasks)
        {
            Assert(task.Bar.Left >= 200, "task starts within the chart board");
            Assert(task.Bar.Left + task.Bar.Width <= 920, "task remains within the chart board");
            Assert(!String.IsNullOrWhiteSpace(task.DisplayTitle), "task label should not be empty");
        }
        Console.WriteLine("C# core smoke tests passed: lanes={0}, tasks={1}, milestones={2}, months={3}", detailed.Lanes.Count, detailed.Tasks.Count, detailed.Milestones.Count, detailed.Months.Count);
        return 0;
    }

    private static void Assert(bool condition, string message)
    {
        if (!condition) throw new Exception("Assertion failed: " + message);
    }
}
