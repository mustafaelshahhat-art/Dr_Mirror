namespace DrMirror.Tests.Infrastructure;

/// <summary>
/// Serializes test classes that bootstrap a WebApplicationFactory. Without this,
/// xUnit parallelizes test classes, causing two factories to spin up Program.cs
/// hosts simultaneously and racing with Coravel's QueuingHost shutdown.
/// </summary>
[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class IntegrationTestCollection
{
    public const string Name = "Integration";
}
