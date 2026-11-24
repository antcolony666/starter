using System.Runtime.InteropServices;
using Microsoft.Office.Core;

namespace Tempo.TimelineAddin
{
    [ComVisible(true)]
    public sealed class Ribbon1 : IRibbonExtensibility
    {
        public string GetCustomUI(string ribbonId)
        {
            return "<customUI xmlns=\"http://schemas.microsoft.com/office/2009/07/customui\"><ribbon><tabs><tab id=\"TempoTimelineTab\" label=\"Tempo 时间线\"><group id=\"TempoTimelineGroup\" label=\"时间线\"><button id=\"TempoTimelineToggle\" label=\"时间线工作台\" size=\"large\" imageMso=\"InsertTable\" onAction=\"ToggleTimelinePane\" screentip=\"打开可编辑的项目时间线工作台\" /></group></tab></tabs></ribbon></customUI>";
        }

        public void ToggleTimelinePane(IRibbonControl control)
        {
            Globals.ThisAddIn.ToggleTimelinePane();
        }
    }
}
