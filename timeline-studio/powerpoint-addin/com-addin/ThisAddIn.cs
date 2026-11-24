using System;
using Microsoft.Office.Tools;

namespace Tempo.TimelineAddin
{
    public partial class ThisAddIn
    {
        private CustomTaskPane _timelinePane;
        private TimelineTaskPaneControl _timelineControl;

        private void ThisAddIn_Startup(object sender, EventArgs e)
        {
            _timelineControl = new TimelineTaskPaneControl();
            _timelinePane = CustomTaskPanes.Add(_timelineControl, "Tempo 时间线");
            _timelinePane.Width = 430;
            _timelinePane.Visible = false;
        }

        private void ThisAddIn_Shutdown(object sender, EventArgs e)
        {
            if (_timelinePane != null)
            {
                _timelinePane.Visible = false;
                _timelinePane = null;
            }
            _timelineControl = null;
        }

        public void ToggleTimelinePane()
        {
            if (_timelinePane != null) _timelinePane.Visible = !_timelinePane.Visible;
        }

        protected override Microsoft.Office.Core.IRibbonExtensibility CreateRibbonExtensibilityObject()
        {
            return new Ribbon1();
        }

        #region VSTO generated code
        private void InternalStartup()
        {
            Startup += ThisAddIn_Startup;
            Shutdown += ThisAddIn_Shutdown;
        }
        #endregion
    }
}
